const fs = require('fs'); const txt = fs.readFileSync('server.ts', 'utf8'); const idx1 = txt.indexOf('case \"PRODUCT_UPSERT\":'); console.log(txt.substring(idx1 - 100, idx1 + 1000));
