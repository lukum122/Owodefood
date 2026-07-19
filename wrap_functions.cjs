const fs = require('fs');

let content = fs.readFileSync('src/context/DatabaseContext.tsx', 'utf8');

// 1. Add `useUpdateManager` import
if (!content.includes('import { useUpdateManager } from "./UpdateManagerContext";')) {
  content = content.replace(
    'import React, { createContext, useContext, useState, useEffect, useMemo } from "react";',
    'import React, { createContext, useContext, useState, useEffect, useMemo } from "react";\nimport { useUpdateManager } from "./UpdateManagerContext";'
  );
}

// 2. Destructure `withUpdateLock` inside `DatabaseProvider`
if (!content.includes('const { withUpdateLock } = useUpdateManager();')) {
  content = content.replace(
    'export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {',
    'export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {\n  const { withUpdateLock } = useUpdateManager();'
  );
}

// Helper to wrap function body
function wrapFunction(funcStartStr, findEndRegex = /^  \};\n/m) {
  const startIdx = content.indexOf(funcStartStr);
  if (startIdx === -1) {
    console.log(`Could not find ${funcStartStr}`);
    return;
  }
  
  const braceIdx = startIdx + funcStartStr.length;
  // insert ` return withUpdateLock(async () => {` after the brace
  const prefix = content.slice(0, braceIdx) + '\n    return withUpdateLock(async () => {';
  
  // find the matching closing brace. 
  // For simplicity since the file is formatted with 2 spaces, the end of these top-level functions in the provider is `  };\n` or similar.
  // Actually, let's find the closing brace by counting.
  let openBraces = 0;
  let endIdx = -1;
  for (let i = braceIdx - 1; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') openBraces--;
    if (openBraces === 0) {
      endIdx = i;
      break;
    }
  }
  
  if (endIdx !== -1) {
    const body = content.slice(braceIdx, endIdx);
    const suffix = '\n    });\n  }' + content.slice(endIdx + 1);
    content = prefix + body + suffix;
    console.log(`Wrapped successfully starting at ${startIdx}`);
  }
}

// 3. Wrap syncSave
wrapFunction('const syncSave = async (type: string, payload: any) => {');
// 4. Wrap login
wrapFunction('const login = async (identifier: string, pin: string, role: UserRole) => {');
// 5. Wrap register
wrapFunction('const register = async (\n    userData: Partial<User>,\n    pin: string,\n    userRole: UserRole,\n    profileData?: Partial<Vendor> | Partial<Rider>\n  ) => {');
// 6. Wrap placeOrder
wrapFunction('const placeOrder = async (deliveryAddress: string, paymentMethod: string, deliveryPhone?: string, receiptImage?: string) => {');
// 7. Wrap requestWalletFunding
wrapFunction('const requestWalletFunding = async (userId: string, amount: number, gateway: "bank_transfer" | "monnify" | "paystack", reference?: string) => {');

fs.writeFileSync('src/context/DatabaseContext.tsx', content, 'utf8');
console.log('Done wrapping');
