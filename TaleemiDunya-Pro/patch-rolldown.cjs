const fs = require('fs');

// Patch 1: rolldown styleText
const file1 = 'node_modules/rolldown/dist/shared/rolldown-build-BVD3dIdE.mjs';
if (fs.existsSync(file1)) {
  let c = fs.readFileSync(file1, 'utf8');
  if (c.includes('import { formatWithOptions, styleText } from "node:util";')) {
    c = c.replace(
      'import { formatWithOptions, styleText } from "node:util";',
      'import { formatWithOptions } from "node:util"; const styleText = (_f, t) => t;'
    );
    fs.writeFileSync(file1, c);
    console.log('Successfully patched rolldown');
  }
}

// Patch 2: vite parseEnv
const file2 = 'node_modules/vite/dist/node/chunks/node.js';
if (fs.existsSync(file2)) {
  let c2 = fs.readFileSync(file2, 'utf8');
  if (c2.includes('parseEnv,')) {
    c2 = c2.replace(
      'import { format, formatWithOptions, inspect, parseEnv, promisify, stripVTControlCharacters } from "node:util";',
      'import { format, formatWithOptions, inspect, promisify, stripVTControlCharacters } from "node:util"; function parseEnv(s){ const r={}; if(!s) return r; for(const l of s.split("\\n")){ const m=l.match(/^\\s*([\\w.-]+)\\s*=\\s*(.*)?\\s*$/); if(m){ let v=(m[2]||"").trim(); if((v.startsWith(\'"\')&&v.endsWith(\'"\'))||(v.startsWith("\'")&&v.endsWith("\'"))) v=v.slice(1,-1); r[m[1]]=v; } } return r; }'
    );
    fs.writeFileSync(file2, c2);
    console.log('Successfully patched vite node.js parseEnv');
  }
}
