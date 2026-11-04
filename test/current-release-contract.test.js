const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {page}=require('./helpers/modern-app.cjs');
test('版本契約：標題與教材庫徽章使用同一發布版本',async t=>{
 const release=JSON.parse(fs.readFileSync(path.join(__dirname,'../release.json'),'utf8'));
 assert.match(release.version,/^\d+\.\d+\.\d+\.\d+$/);
 const w=await page(t,'index.html','http://localhost/');
 assert.equal(w.document.title.match(/\[v([^\]]+)\]/)[1],release.version);
 w._v144UpdateMasterHealth();assert.equal(w.document.querySelector('#master-version-badge').textContent,'v'+release.version);
});
