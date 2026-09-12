/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS bootstrap for the TypeScript seed generator. */
const ts=require('typescript'),fs=require('fs');require.extensions['.ts']=(m,f)=>m._compile(ts.transpile(fs.readFileSync(f,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}),f);require('./generate-seed.ts');

