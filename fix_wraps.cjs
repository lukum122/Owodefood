const fs = require('fs');
let content = fs.readFileSync('src/context/DatabaseContext.tsx', 'utf8');

function wrapFunctionRegex(funcName) {
  // Find the start of the function, e.g., 'const login = async (...args) => {'
  const regex = new RegExp('const ' + funcName + ' = async \\\\([\\\\s\\\\S]*?\\\\) => \\\\{');
  const match = content.match(regex);
  if (!match) {
    console.log('Could not find ' + funcName);
    return;
  }
  
  const startIdx = match.index;
  const braceIdx = startIdx + match[0].length;
  
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
    console.log('Wrapped successfully: ' + funcName);
  }
}

['login', 'register', 'placeOrder'].forEach(wrapFunctionRegex);

fs.writeFileSync('src/context/DatabaseContext.tsx', content, 'utf8');
console.log('Done fixing');
