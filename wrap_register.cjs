const fs = require('fs');

let content = fs.readFileSync('src/context/DatabaseContext.tsx', 'utf8');

const target = `  const register = async (
    name: string,
    email: string,
    phone: string,
    role: UserRole,
    gender?: string,
    extra?: { businessName?: string; cuisine?: string; vehicleType?: string; pin?: string }
  ) => {`;

const startIdx = content.indexOf(target);
if (startIdx !== -1) {
  const braceIdx = startIdx + target.length;
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
    console.log(`Wrapped successfully starting at ${startIdx}`);
    fs.writeFileSync('src/context/DatabaseContext.tsx', content, 'utf8');
  }
} else {
  console.log("Could not find register");
}
