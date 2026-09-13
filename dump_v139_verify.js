// v139 verify (Safari-safe): 直接 invoke renderAeSubjectCardHtml 看「考古題」會不會被過濾
;(function(){
var __out = new Object();
__out.userKey = '';
__out.deletedTypes = {};
__out.renderedLabels = [];
__out.htmlLen = 0;
__out.htmlSnippet = '';
__out.error = '';
__out.kaoguStillRendered = false;
try {
    var DATA = JSON.parse(localStorage.getItem('StudyMap_Family_Data_V20') || '{}');
    var keys = Object.keys(DATA);
    for (var i = 0; i < keys.length; i++) {
        if (DATA[keys[i]] && DATA[keys[i]].name === 'Denias') {
            __out.userKey = keys[i];
            break;
        }
    }
    var user = DATA[__out.userKey] || {};
    __out.deletedTypes = user._deletedTypes || {};

    if (typeof renderAeSubjectCardHtml !== 'function') {
        __out.error = 'renderAeSubjectCardHtml not a function (Safari cache?)';
        alert('ERROR: ' + JSON.stringify(__out));
        return;
    }

    var fakeSubUnits = [];
    fakeSubUnits.push({sub:'公民', u:{name:'test1'}, vol:'', typeName:'複習講義', instanceName:''});
    fakeSubUnits.push({sub:'公民', u:{name:'test2'}, vol:'', typeName:'考古題', instanceName:''});

    var html = renderAeSubjectCardHtml('公民', fakeSubUnits, '段考複習', '第一次段考');

    var typeSection = html.match(/教材類型:[\s\S]*?<\/div>/);
    if (typeSection) {
        var labels = typeSection[0].match(/>([^<>]{1,20})</g);
        if (labels) {
            for (var li = 0; li < labels.length; li++) {
                __out.renderedLabels.push(labels[li].replace(/[><]/g, '').trim());
            }
        }
    }
    __out.htmlLen = html.length;
    __out.htmlSnippet = html.slice(0, 400);

    for (var ki = 0; ki < __out.renderedLabels.length; ki++) {
        if (__out.renderedLabels[ki].indexOf('考古') >= 0) {
            __out.kaoguStillRendered = true;
            break;
        }
    }

    var lines = [];
    lines.push('v139 verify done!');
    lines.push('');
    lines.push('User _deletedTypes:');
    lines.push(JSON.stringify(__out.deletedTypes));
    lines.push('');
    lines.push('Rendered labels:');
    lines.push(JSON.stringify(__out.renderedLabels));
    lines.push('');
    lines.push('kaoguStillRendered: ' + __out.kaoguStillRendered);
    lines.push('');
    lines.push('html snippet:');
    lines.push(__out.htmlSnippet);
    alert(lines.join('\n'));
} catch(e) {
    alert('ERROR: ' + e.message + '\n' + e.stack);
}
})();
