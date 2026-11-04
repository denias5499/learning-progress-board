const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),crypto=require('node:crypto');
const ledger=require('./retired-tests-v178.json');
function registrations(file){const names=new Set(),run=name=>names.add(name);run.skip=()=>{};run.todo=()=>{};run.after=()=>{};run.before=()=>{};const full=path.join(__dirname,file);vm.runInNewContext(fs.readFileSync(full,'utf8'),{require:name=>name==='node:test'?run:createRequire(full)(name),__dirname:path.dirname(full),__filename:full,module:{exports:{}},exports:{},console,process,Buffer},{filename:full});return names;}
test('退役追蹤：151項原始斷言都有理由、原文校驗及可執行的替代驗證',()=>{
 assert.equal(ledger.cases.length,151);const ids=new Set(),cache=new Map();
 for(const c of ledger.cases){assert(!ids.has(c.id));ids.add(c.id);assert(c.reason.length>20);assert.equal(crypto.createHash('sha256').update(c.source).digest('hex'),c.sha256);assert(c.replacements.length>0,c.title);
  for(const r of c.replacements){const file=path.join(__dirname,r.file);assert(fs.existsSync(file),r.file);if(r.kind==='browser'){assert(fs.readFileSync(file,'utf8').includes(r.marker));const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/test.yml'),'utf8');assert(workflow.includes('node test/e2e/current-contracts.e2e.cjs'),'browser checks must run in CI');}else{if(!cache.has(r.file))cache.set(r.file,registrations(r.file));assert(cache.get(r.file).has(r.test),r.file+': '+r.test);}}
 }
});
test('回歸規範：現行測試不得再留下未處理的skip或todo',()=>{
 for(const file of fs.readdirSync(__dirname).filter(f=>f.endsWith('.test.js'))){if(file===path.basename(__filename))continue;const source=fs.readFileSync(path.join(__dirname,file),'utf8');assert.doesNotMatch(source,/\btest\.(?:skip|todo)\s*\(/,file);}
});

test('新規則追蹤：另行改寫的10項自動修正測試保留原文並維持可執行案例數',()=>{const record=require('./confirmed-rule-updates-v178.json');assert.equal(crypto.createHash('sha256').update(record.originalSource).digest('hex'),record.sha256);assert.equal(registrations(record.replacement).size,record.replacementTestCount);assert.equal(record.originalTestCount,10);});
