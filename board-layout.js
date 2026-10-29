/* Presentation only. Statistics read the current student's existing plans and materials. */
function getTreeTypeStats(subject, context, originalSubject) {
    var all = _collectSubjectUnits(originalSubject || subject);
    var progress = TreePageProgress.create(originalSubject || subject, all, appPlans, context);
    var groups = {}, seen = new Set();
    _collectSubjectUnits(subject).forEach(function(unit) {
        var type = unit._typeName || '教材';
        var key = JSON.stringify([type,unit._instanceName,unit.vol,unit.id]);
        if (seen.has(key)) return; seen.add(key);
        if (!groups[type]) groups[type] = { name:type, total:0, done:0, active:0, todo:0, missing:0 };
        var group = groups[type], value = progress.unit(unit); group.total++;
        if (value.basis === 'missing') group.missing++;
        else if (value.total > 0 && value.done >= value.total) group.done++;
        else if (value.done > 0) group.active++;
        else group.todo++;
    });
    return groups;
}
function treeMeter(percent, label) {
    percent = Math.max(0,Math.min(100,percent || 0));
    var match=/^(\d+)\/(\d+) \((\d+)%\)$/.exec(label || '');
    var text=match ? '<span class="tree-progress-label"><span class="tree-progress-number">'+match[1]+'</span><span>/</span><span class="tree-progress-number">'+match[2]+'</span><span class="tree-progress-percent"> ('+match[3]+'%)</span></span>' : '<span class="tree-meter-label">'+escapeHtml(label)+'</span>';
    return '<span class="tree-meter" aria-hidden="true"><span style="width:'+percent+'%"></span></span>'+text;
}
function renderTreeTypeCard(group, expandable) {
    var pct = group.total ? Math.round(group.done/group.total*100) : 0;
    var series = group.name === '複習講義' ? 'lecture' : 'practice';
    return '<div class="tree-type-card" data-type-name="'+escapeHtml(group.name)+'" data-series="'+series+'">'+
        '<h3>'+escapeHtml(group.name)+'</h3>'+
        '<div class="tree-type-track" role="progressbar" aria-label="'+escapeHtml(group.name)+'單元完成率" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+pct+'%"></span></div>'+
        '<div class="tree-type-count"><span>'+pct+'% · 已完成 '+group.done+'／'+group.total+' 單元</span></div>'+
        (expandable ? '<button type="button" class="tree-type-toggle" aria-expanded="true">收合單元</button>' : '')+
        '<div class="tree-type-state">進行中 '+group.active+' · 未開始 '+group.todo+(group.missing ? ' · 未設定頁碼 '+group.missing : '')+'</div></div>';
}
function renderSubjectTypeOverview(root, subjects) {
    var html = '';
    Object.keys(subjects).forEach(function(key) {
        var entry = subjects[key], groups = getTreeTypeStats(entry.subj, treeScopeContext(entry), entry.originalSubj);
        html += '<section class="tree-subject-summary"><div class="tree-subject-summary-header" data-tree-subject="'+escapeHtml(key)+'">'+
            '<span class="tree-subject-summary-name">'+escapeHtml(entry.name)+'</span><button type="button" class="tree-type-toggle">▸ 展開</button></div>';
        Object.keys(groups).forEach(function(type) { html += renderTreeTypeCard(groups[type], false); });
        html += '</section>';
    });
    root.innerHTML = html;
    root.querySelectorAll('[data-tree-subject]').forEach(function(header) {
        header.addEventListener('click',function() { _meExpandTreeSubject(header.dataset.treeSubject); });
    });
}
function bindTreeTypeToggles(root) {
    var state=treeExpansionState(),select=document.getElementById('tree-type-filter'),selected=select&&select.value||'ALL';
    root.querySelectorAll('.tree-type-toggle[aria-expanded]').forEach(function(button) {
        var section=button.closest('.tree-type-section'),type=section.querySelector('[data-type-name]').dataset.typeName,details=section.querySelector('.tree-type-details');
        if(selected===type)state[type]=true;
        if(!(type in state))state[type]=type==='複習講義';
        function apply(){details.hidden=!state[type];button.setAttribute('aria-expanded',String(state[type]));button.textContent=state[type]?'收合單元':'查看單元';}
        apply();button.addEventListener('click',function(){state[type]=!state[type];apply();});
    });
}
document.addEventListener('click',function(event) {
    var menu = document.getElementById('planner-more');
    if (menu && (!menu.contains(event.target) || event.target.closest('button'))) menu.open = false;
});
document.addEventListener('keydown',function(event) {
    var menu = document.getElementById('planner-more');
    if (event.key === 'Escape' && menu && menu.open) { menu.open=false; menu.querySelector('summary').focus(); }
});

/* v158: compact overview, book/volume hierarchy and accuracy remainder. */
function treeAccuracyMeter(percent) {
    var color = percent >= 96 ? '#27ae60' : (percent >= 90 ? '#f59e0b' : '#ef4444');
    return '<span class="tree-meter tree-accuracy-meter'+(percent < 100 ? ' has-remainder' : '')+'" aria-hidden="true"><span style="width:'+percent+'%;background:'+color+'"></span></span><span class="tree-meter-label" style="color:'+color+'">'+percent+'%</span>';
}
function treeUnitHeader() {
    return '<div class="tree-units-header"><span>單元名稱</span><span>頁碼</span><span>答對率</span><span>完成度</span><span>排程天數</span></div>';
}
function renderCompactTreeBooks(instances, typeName, progress, renderRow) {
    var html = '';
    Object.keys(instances).filter(function(key) { return instances[key].typeName === typeName; }).forEach(function(key) {
        var book = instances[key], units = [];
        Object.keys(book.vols).forEach(function(v) { units = units.concat(book.vols[v].units); });
        var seen = new Set(), total=0, done=0;
        units.forEach(function(u) {
            var identity=JSON.stringify([u.vol,u.id]); if(seen.has(identity)) return; seen.add(identity); total++;
            var value=progress.unit(u); if(value.total>0&&value.done>=value.total) done++;
        });
        html += '<section class="tree-book"><button type="button" class="tree-book-toggle" aria-expanded="true"><span class="tree-fold-arrow" aria-hidden="true">▾</span><span>'+escapeHtml(book.instanceName || '(未命名教材)')+'</span><span class="tree-book-count">已完成 '+done+'／'+total+' 單元</span></button><div class="tree-book-details">'+treeUnitHeader();
        Object.keys(book.vols).forEach(function(v) {
            var volume=book.vols[v]; if(!volume.units.length) return;
            html += '<section class="tree-volume">';
            if(volume.volName) html += '<button type="button" class="tree-volume-toggle" aria-expanded="true"><span class="tree-fold-arrow" aria-hidden="true">▾</span><span>'+escapeHtml(volume.volName)+'</span><span class="tree-book-count">'+volume.units.length+' 單元</span></button>';
            html += '<ul class="tree-units">';
            volume.units.forEach(function(u) { html += renderRow(u,{sub:null,typeName:book.typeName,instanceName:book.instanceName,vol:volume.volName}); });
            html += '</ul></section>';
        });
        html += '</div></section>';
    });
    return html;
}
function bindCompactTreeControls(root) {
    function setState(button, content, expanded) {
        content.hidden=!expanded;button.setAttribute('aria-expanded',String(expanded));
        var arrow=button.querySelector('.tree-fold-arrow');if(arrow)arrow.textContent=expanded?'▾':'▸';
    }
    root.querySelectorAll('.tree-book-toggle,.tree-volume-toggle').forEach(function(button) {
        button.addEventListener('click',function() {
            var content=button.classList.contains('tree-book-toggle')?button.parentElement.querySelector('.tree-book-details'):button.parentElement.querySelector('.tree-units');
            setState(button,content,content.hidden);
        });
    });
    root.querySelectorAll('[data-tree-expand]').forEach(function(control) {
        control.addEventListener('click',function() {
            var expanded=control.dataset.treeExpand==='true';
            var subject=control.closest('.tree-subject');
            subject.querySelectorAll('.tree-type-details').forEach(function(pane) { pane.hidden=!expanded; });
            var states=treeExpansionState();subject.querySelectorAll('[data-type-name]').forEach(function(card){states[card.dataset.typeName]=expanded;});
            subject.querySelectorAll('.tree-type-toggle[aria-expanded]').forEach(function(button) { button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'收合單元':'查看單元'; });
            subject.querySelectorAll('.tree-book-toggle,.tree-volume-toggle').forEach(function(button) {
                var content=button.classList.contains('tree-book-toggle')?button.parentElement.querySelector('.tree-book-details'):button.parentElement.querySelector('.tree-units');
                setState(button,content,expanded);
            });
        });
    });
}

/* v159 scope selectors are UI state only; never rewrite student data. */
var _treeScopeOwner=null;
var _treeExpansionKey='';
var _treeExpandedTypes={};
function syncTreeScopeFilters(user){
 var cat=document.getElementById('tree-category-filter'),mis=document.getElementById('tree-mission-filter');
 if(!cat||!mis)return {category:'ALL',mission:'ALL'};
 var changed=_treeScopeOwner!==currentUserId,chosen=changed?'ALL':cat.value,mission=changed?'ALL':mis.value;
 _treeScopeOwner=currentUserId;
 var categories=Array.from(new Set(Object.keys(user&&user.masters||{}).concat(Object.keys(user&&user.missions||{}))));
 cat.innerHTML='';cat.add(new Option('全部進度分類','ALL'));categories.forEach(function(name){cat.add(new Option(name,name));});cat.value=categories.includes(chosen)?chosen:'ALL';
 mis.innerHTML='';mis.add(new Option('全部任務','ALL'));var names=cat.value==='ALL'?[]:Object.keys(user&&user.missions&&user.missions[cat.value]||{});
 names.forEach(function(name){mis.add(new Option(name,name));});mis.value=names.includes(mission)?mission:'ALL';mis.disabled=cat.value==='ALL';
 var scope={category:cat.value,mission:mis.value};
 var label=document.getElementById('tree-scope-description');if(label)label.textContent='統計範圍：'+(scope.category==='ALL'?'全部進度分類':scope.category)+' ／ '+(scope.mission==='ALL'?'全部任務':scope.mission)+'。任務僅篩選顯示單元；完成度、排程天數累計同分類下所有任務，答對率為單元累計。';
 return scope;
}
function getTreeScope(){
 var cat=document.getElementById('tree-category-filter'),mis=document.getElementById('tree-mission-filter');
 return {category:cat&&cat.value||'ALL',mission:mis&&mis.value||'ALL'};
}
function treeScopeContext(entry){return {subject:entry.name,category:entry.cat,mission:null};}
function onTreeScopeChange(categoryChanged){
 if(categoryChanged)document.getElementById('tree-mission-filter').value='ALL';
 ['tree-subject-filter','tree-type-filter','tree-vol-filter'].forEach(function(id){var input=document.getElementById(id);if(input)input.value='ALL';});
 resetTreeExpansion();renderTreeView();
}
function resetTreeExpansion(){_treeExpansionKey='';_treeExpandedTypes={};}
function treeExpansionState(){
 var scope=getTreeScope(),subject=document.getElementById('tree-subject-filter');var key=JSON.stringify([typeof currentUserId==='undefined'?'':currentUserId,scope.category,scope.mission,subject&&subject.value]);
 if(key!==_treeExpansionKey){_treeExpansionKey=key;_treeExpandedTypes={};}
 return _treeExpandedTypes;
}
