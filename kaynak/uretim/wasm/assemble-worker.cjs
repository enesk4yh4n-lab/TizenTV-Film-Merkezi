'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const babel = require('@babel/core');
assert(process.argv.length === 4, 'Usage: assemble-worker.cjs <owned-http.js> <worker-output.js>');
const inputs = path.resolve(__dirname, '../../ortak/ag/wasm');
const source = fs.readFileSync(process.argv[2], 'utf8');
const compiled = babel.transformSync(source, {
  babelrc: false,
  configFile: false,
  comments: false,
  compact: true,
  plugins: [
    require('@babel/plugin-transform-arrow-functions'),
    require('@babel/plugin-transform-for-of'),
    require('@babel/plugin-transform-block-scoping')
  ]
}).code;
const pre = fs.readFileSync(path.join(inputs, 'worker-prefix.js'), 'utf8');
const post = fs.readFileSync(path.join(inputs, 'worker-suffix.js'), 'utf8');
fs.writeFileSync(process.argv[3], pre + '\n' + compiled + '\n' + post + '\n');
