// 列舉 localStorage 所有 key + 各 key 內含的 typeName 統計
;(function(){
var __out = new Object();
__out.allKeys = [];
__out.summary = [];
__out.deniasFound = '';
try {
    // 完整列舉 localStorage
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k) __out.allKeys.push(k);
    }
    __out.allKeys.sort();

    // 嘗試找 Denias 在哪個 key
    var dk = null;
    for (var ki = 0; ki < __out.allKeys.length; ki++) {
        var keyName = __out.allKeys[ki];
        try {
            var raw = localStorage.getItem(keyName);
            if (!raw) continue;
            if (raw.indexOf('Denias') < 0) continue;
            // 找到了
            var obj;
            try { obj = JSON.parse(raw); } catch(pe) { __out.summary.push(keyName + ' (parse fail)'); continue; }
            __out.deniasFound = keyName;
            // 列舉底下結構
            if (typeof obj === 'object' && obj !== null) {
                var topKeys = Object.keys(obj);
                for (var ti = 0; ti < topKeys.length; ti++) {
                    var tk = topKeys[ti];
                    var tv = obj[tk];
                    if (tv && typeof tv === 'object') {
                        if (tv.name === 'Denias' || (tk && tk.toLowerCase().indexOf('denias') >= 0)) {
                            // 統計
                            var summary = '  - ' + tk + ': ';
                            if (tv.masters) summary += 'has masters, ';
                            if (tv.subjects) summary += 'has subjects, ';
                            if (tv.log) summary += 'has log, ';
                            if (tv.materials) summary += 'has materials, ';
                            if (tv.progress) summary += 'has progress, ';
                            __out.summary.push(summary);
                        }
                    }
                }
            }
        } catch(e) {
            __out.summary.push(keyName + ' ERROR: ' + e.message);
        }
    }

    var lines = [];
    lines.push('=== localStorage 所有 key ===');
    lines.push('count: ' + __out.allKeys.length);
    lines.push(JSON.stringify(__out.allKeys));
    lines.push('');
    lines.push('=== Denias 位置 ===');
    lines.push('deniasFound: ' + __out.deniasFound);
    lines.push(JSON.stringify(__out.summary, null, 2));
    lines.push('');
    lines.push('=== multiData currentUserId 推測 ===');
    try {
        var md = JSON.parse(localStorage.getItem('StudyMap_Family_Data_V20') || '{}');
        lines.push('StudyMap_Family_Data_V20 內 top keys: ' + JSON.stringify(Object.keys(md)));
        if (md.config) {
            lines.push('config 內容: ' + JSON.stringify(md.config).slice(0, 500));
        }
    } catch(e) {
        lines.push('err: ' + e.message);
    }
    alert(lines.join('\n'));
} catch(e) {
    alert('ERROR: ' + e.message + '\n' + e.stack);
}
})();
