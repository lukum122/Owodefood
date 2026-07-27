const fs = require('fs');
let content = fs.readFileSync('src/context/DatabaseContext.tsx', 'utf8');

function wrapFunctionExact(funcStartStr) {
  const startIdx = content.indexOf(funcStartStr);
  if (startIdx === -1) {
    console.log('Could not find: ' + funcStartStr.slice(0, 50));
    return;
  }
  
  const braceIdx = startIdx + funcStartStr.length;
  
  const prefix = content.slice(0, braceIdx) + '\n    return withUpdateLock(async () => {';
  
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
    console.log('Wrapped successfully: ' + funcStartStr.slice(0, 30));
  }
}

const loginStr = 'const login = async (identifier: string, pin: string, role: UserRole, preventStateUpdate: boolean = false) => {';
const registerStr = `const register = async (
    name: string,
    email: string,
    phone: string,
    role: UserRole,
    gender?: string,
    extra?: { businessName?: string; cuisine?: string; vehicleType?: string; pin?: string }
  ) => {`;
const placeOrderStr = `const placeOrder = async (
    deliveryAddress: string,
    paymentMethod: string,
    deliveryPhone?: string,
    receiptImage?: string,
    options?: {
      orderType?: "standard" | "receipt_pickup";
      receiptImageOrQr?: string;
      receiptNote?: string;
      vendorId?: string;
    }
  ) => {`;

wrapFunctionExact(loginStr);
wrapFunctionExact(registerStr);
wrapFunctionExact(placeOrderStr);

fs.writeFileSync('src/context/DatabaseContext.tsx', content, 'utf8');
console.log('Done fixing');
