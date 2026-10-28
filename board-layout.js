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
    return '<span class="tree-meter" aria-hidden="true"><span style="width:'+percent+'%"></span></span><span class="tree-meter-label">'+escapeHtml(label)+'</span>';
}
function renderTreeTypeCard(group, expandable) {
    var pct = group.total ? Math.round(group.done/group.total*100) : 0;
    return '<div class="tree-type-card" data-type-name="'+escapeHtml(group.name)+'">'+
        '<div class="tree-type-card-heading"><h3>'+escapeHtml(group.name)+'</h3>'+
        (expandable ? '<button type="button" class="tree-type-toggle" aria-expanded="true">收合單元</button>' : '')+'</div>'+
        '<div class="tree-type-count"><span>已完成 '+group.done+'／'+group.total+' 單元</span><span>單元完成率 '+pct+'%</span></div>'+
        '<div class="tree-type-track" role="progressbar" aria-label="'+escapeHtml(group.name)+'單元完成率" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+pct+'%"></span></div>'+
        '<div class="tree-type-state">進行中 '+group.active+' · 未開始 '+group.todo+(group.missing ? ' · 未設定頁碼 '+group.missing : '')+'</div></div>';
}
function renderSubjectTypeOverview(root, subjects) {
    var html = '';
    Object.keys(subjects).forEach(function(key) {
        var entry = subjects[key], groups = getTreeTypeStats(entry.subj, {subject:entry.name,category:entry.cat});
        html += '<section class="tree-subject-summary"><div class="tree-subject-summary-header" data-tree-subject="'+escapeHtml(key)+'">'+
            '<span class="tree-subject-summary-name">'+escapeHtml(entry.name)+'</span><button type="button" class="tree-type-toggle">查看教材與單元</button></div>';
        Object.keys(groups).forEach(function(type) { html += renderTreeTypeCard(groups[type], false); });
        html += '</section>';
    });
    root.innerHTML = html;
    root.querySelectorAll('[data-tree-subject]').forEach(function(header) {
        header.addEventListener('click',function() { _meExpandTreeSubject(header.dataset.treeSubject); });
    });
}
function bindTreeTypeToggles(root) {
    root.querySelectorAll('.tree-type-toggle[aria-expanded]').forEach(function(button) {
        button.addEventListener('click',function() {
            var details = button.closest('.tree-type-section').querySelector('.tree-type-details');
            details.hidden = !details.hidden;
            button.setAttribute('aria-expanded',String(!details.hidden));
            button.textContent = details.hidden ? '查看單元' : '收合單元';
        });
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
