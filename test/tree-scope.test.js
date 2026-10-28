const test=require('node:test'),assert=require('node:assert/strict');
const {filterSubject}=require('../tree-scope');const {create}=require('../tree-progress');
test('任務範圍過濾保留所選單元、鏡像與冊次順序，不改動教材',()=>{
 const s={units:[{id:'b'}],materials:{'複習講義':{instances:[{name:'甲',volOrder:['一','二'],vols:{'一':[{id:'a'}],'二':[{id:'b'}]},units:[{id:'a'},{id:'b'}]}]}}};
 const before=JSON.stringify(s),visible=filterSubject(s,new Set(['a']));
 assert.deepEqual(visible.materials['複習講義'].instances[0].volOrder,['一']);assert.deepEqual(visible.units,[]);
 assert.deepEqual(visible.materials['複習講義'].instances[0].units,[{id:'a'}]);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(filterSubject(s,new Set()).materials,{});assert.equal(filterSubject(s,null),s);
});
test('完成度嚴格依分類與任務篩選，其他任務完成不得移入',()=>{
 const u={id:'a',start:1,end:10,vol:'一',_typeName:'複習講義',_instanceName:'甲'};
 const s={materials:{'複習講義':{}}};const plans=[{grid:{day:[
 {unitId:'a',cat:'會考',mis:'一模',isDone:true,startPage:1,endPage:10},
 {unitId:'a',cat:'會考',mis:'二模',isDone:true,startPage:1,endPage:4},
 {unitId:'a',cat:'會考',mis:'二模',isDone:false,startPage:5,endPage:10},
 {unitId:'a',cat:'段考',mis:'二模',isDone:true,startPage:1,endPage:10},
 {unitId:'a',mis:'二模',isDone:true,startPage:1,endPage:10}
 ]}}];
 assert.equal(create(s,[u],plans,{category:'會考',mission:'二模'}).unit(u).done,4);
 assert.equal(create(s,[u],plans,{category:'會考',mission:'一模'}).unit(u).done,10);
 assert.equal(create(s,[u],plans,{category:'會考',mission:'不存在'}).unit(u).done,0);
});
