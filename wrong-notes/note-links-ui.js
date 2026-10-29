/* Explicit association selectors. No migration or name-based guessing for legacy notes. */
function noteLinkOptions(select, placeholder, rows, value, label) {
    select.replaceChildren(new Option(placeholder, ''));
    rows.forEach(function(row) { select.add(new Option(label(row), value(row))); });
}
function initNoteLinkFields(card, existing) {
    var subj = card.querySelector('.subj-sel'), unit = card.querySelector('.unit-sel');
    var old = card.querySelector('.note-link-fields'); if (old) old.remove();
    var box = document.createElement('div'); box.className = 'note-link-fields';
    function add(title, cls) { var label=document.createElement('label');label.textContent=title;var s=document.createElement('select');s.className=cls;label.appendChild(s);box.appendChild(label);return s; }
    var category=add('進度分類（必選）','note-category'), task=add('任務（必選）','note-task'), book=add('知識單元教材：複習講義（必選）','note-book');
    unit.insertAdjacentElement('beforebegin',box);
    var rows=NoteLinks.catalog(requireNoteStudent());
    var cats=Array.from(new Map(rows.filter(r=>r.subject===subj.value).map(r=>[r.categoryId,r])).values());
    noteLinkOptions(category,'請選擇進度分類',cats,r=>r.categoryId,r=>r.category);
    function units(){
        var chosen=rows.filter(r=>r.subject===subj.value&&r.categoryId===category.value&&r.instanceId===book.value);
        noteLinkOptions(unit,'請選擇知識單元',chosen,NoteLinks.identity,r=>(r.volume?r.volume+' / ':'')+r.unitName);
        unit.disabled=!chosen.length;
    }
    function books(){
        var books=Array.from(new Map(rows.filter(r=>r.subject===subj.value&&r.categoryId===category.value).map(r=>[r.instanceId,r])).values());
        noteLinkOptions(book,'請選擇複習講義教材',books,r=>r.instanceId,r=>r.instanceName);
        if(books.length===1)book.value=books[0].instanceId;
        noteLinkOptions(task,'請選擇任務',NoteLinks.tasks(requireNoteStudent(),category.value),r=>r.missionId,r=>r.missionName);
        units();
    }
    category.onchange=books; book.onchange=units;
    if(cats.length===1)category.value=cats[0].categoryId;
    if(existing&&cats.some(r=>r.categoryId===existing.syllabus?.categoryId))category.value=existing.syllabus.categoryId;
    books();
    if(existing){
        if(Array.from(book.options).some(o=>o.value===existing.syllabus?.instanceId))book.value=existing.syllabus.instanceId;
        units();unit.value=existing.syllabus?NoteLinks.identity(existing.syllabus):'';
        task.value=existing.task?.missionId||'';
    }
}
function readNoteLinkFields(card) {
    var rows=NoteLinks.catalog(requireNoteStudent());
    var syllabus=rows.find(r=>NoteLinks.identity(r)===card.querySelector('.unit-sel').value);
    var task=NoteLinks.tasks(requireNoteStudent(),card.querySelector('.note-category').value).find(r=>r.missionId===card.querySelector('.note-task').value);
    return NoteLinks.validate(requireNoteStudent(),{noteLinkVersion:1,syllabus,task});
}
function appendSavedNoteLinks(slot,note,editBox) {
    var info=document.createElement('p');info.className='note-link-summary';
    if(note.noteLinkVersion===1){
        var result=NoteLinks.resolve(requireNoteStudent(),note.syllabus,note.task);
        info.textContent=result.status==='linked'?result.syllabus.category+' / '+(result.task?.missionName||'未指定任務')+'｜'+result.syllabus.instanceName+'｜'+(result.syllabus.volume?result.syllabus.volume+' / ':'')+result.syllabus.unitName:'關聯待修正：'+result.reason;
    }else info.textContent='舊測試資料：未建立正式分類／任務關聯';
    slot.querySelector('.note-slot-header').appendChild(info);
    var card=document.createElement('div');card.className='saved-note-link-fields';
    var label=document.createElement('label');label.textContent='科目';var subj=document.createElement('select');subj.className='subj-sel';label.appendChild(subj);card.appendChild(label);
    var units=document.createElement('select');units.className='unit-sel';card.appendChild(units);
    var rows=NoteLinks.catalog(requireNoteStudent());
    noteLinkOptions(subj,'請選擇科目',Array.from(new Set(rows.map(r=>r.subject))),r=>r,r=>r);
    subj.value=note.subject||'';subj.onchange=function(){initNoteLinkFields(card);};
    initNoteLinkFields(card,note);editBox.appendChild(card);
}
function initNoteLinkFilters(){
    var bar=document.querySelector('.filter-bar');
    var category=document.createElement('select');category.id='filter-note-category';category.className='filter-select';
    var task=document.createElement('select');task.id='filter-note-task';task.className='filter-select';bar.append(category,task);
    function refresh(){
        var chosen=category.value,oldTask=task.value;
        var rows=NoteLinks.catalog(requireNoteStudent());var cats=Array.from(new Map(rows.map(r=>[r.categoryId,r])).values());
        noteLinkOptions(category,'全部進度分類',cats,r=>r.categoryId,r=>r.category);category.value=chosen;
        noteLinkOptions(task,'全部任務',NoteLinks.tasks(requireNoteStudent(),category.value),r=>r.missionId,r=>r.missionName);task.value=oldTask;
    }
    refresh();category.onchange=function(){task.value='';refresh();renderViewPage();};task.onchange=renderViewPage;
}
function noteMatchesTask(note){
    var c=document.getElementById('filter-note-category'),m=document.getElementById('filter-note-task');
    return (!c?.value||note.syllabus?.categoryId===c.value)&&(!m?.value||note.task?.missionId===m.value);
}
