// 追查「考古題」unit 從哪個 localStorage 欄位來
;(function(){
var __out = new Object();
__out.userKey = '';
__out.deletedTypes = {};
__out.subjectsWithKaogu = [];
__out.kaoguInMaster = [];
__out.kaoguInLog = [];
__out.kaoguInCollect = [];
__out.kaoguInProgress = [];
__out.kaoguInMaterials = [];
try {
    var DATA = JSON.parse(localStorage.getItem('StudyMap_Family_Data_V20') || '{}');
    var keys = Object.keys(DATA);
    for (var i = 0; i < keys.length; i++) {
        if (DATA[keys[i]] && DATA[keys[i]].name === 'Denias') {
            __out.userKey = keys[i];
            break;
        }
    }
    if (!__out.userKey) {
        alert('找不到 Denias user, keys=' + JSON.stringify(keys));
        return;
    }
    var user = DATA[__out.userKey];
    __out.deletedTypes = user._deletedTypes || {};

    // 1. 掃 masters
    if (user.masters) {
        Object.keys(user.masters).forEach(function(cat){
            var catObj = user.masters[cat];
            if (!catObj) return;
            Object.keys(catObj).forEach(function(sub){
                var subj = catObj[sub];
                if (!subj || !subj.materials) return;
                if (subj.materials['考古題']) {
                    __out.kaoguInMaster.push(cat + ' > ' + sub);
                }
            });
        });
    }

    // 2. 掃 log.mission 內的 unit.typeName
    if (user.log && user.log.mission) {
        Object.keys(user.log.mission).forEach(function(cat){
            var catObj = user.log.mission[cat];
            if (!catObj) return;
            Object.keys(catObj).forEach(function(misKey){
                var mis = catObj[misKey];
                if (!mis || !mis.subjects) return;
                Object.keys(mis.subjects).forEach(function(sub){
                    var arr = mis.subjects[sub];
                    if (Array.isArray(arr)) {
                        arr.forEach(function(u){
                            if (u && u.typeName === '考古題') {
                                __out.kaoguInLog.push(cat + ' > ' + misKey + ' > ' + sub + ' > ' + (u.name||'?'));
                            }
                        });
                    }
                });
            });
        });
    }

    // 3. 掃 collectSubjectUnits 結果 (subjects 內 _collectSubjectUnits 結構)
    if (user.subjects) {
        Object.keys(user.subjects).forEach(function(cat){
            var catObj = user.subjects[cat];
            if (!catObj) return;
            Object.keys(catObj).forEach(function(misKey){
                var mis = catObj[misKey];
                if (!mis || !mis.subjects) return;
                Object.keys(mis.subjects).forEach(function(sub){
                    var arr = mis.subjects[sub];
                    if (Array.isArray(arr)) {
                        arr.forEach(function(u){
                            if (u && u.typeName === '考古題') {
                                __out.kaoguInCollect.push(cat + ' > ' + misKey + ' > ' + sub + ' > ' + (u.name||'?'));
                            }
                        });
                    }
                });
            });
        });
    }

    // 4. 掃 progress (舊進度資料)
    if (user.progress) {
        Object.keys(user.progress).forEach(function(cat){
            var catObj = user.progress[cat];
            if (!catObj) return;
            Object.keys(catObj).forEach(function(misKey){
                var mis = catObj[misKey];
                if (!mis || !mis.subjects) return;
                Object.keys(mis.subjects).forEach(function(sub){
                    var arr = mis.subjects[sub];
                    if (Array.isArray(arr)) {
                        arr.forEach(function(u){
                            if (u && u.typeName === '考古題') {
                                __out.kaoguInProgress.push(cat + ' > ' + misKey + ' > ' + sub + ' > ' + (u.name||'?'));
                            }
                        });
                    }
                });
            });
        });
    }

    // 5. 掃 materials (有的版本)
    if (user.materials) {
        Object.keys(user.materials).forEach(function(cat){
            var catObj = user.materials[cat];
            if (!catObj) return;
            Object.keys(catObj).forEach(function(sub){
                var subj = catObj[sub];
                if (!subj || !subj.materials) return;
                if (subj.materials['考古題']) {
                    __out.kaoguInMaterials.push(cat + ' > ' + sub);
                }
            });
        });
    }

    var lines = [];
    lines.push('考古題 unit 來源追查');
    lines.push('userKey: ' + __out.userKey);
    lines.push('_deletedTypes: ' + JSON.stringify(__out.deletedTypes));
    lines.push('');
    lines.push('=== user.masters 內「考古題」type ===');
    lines.push('count: ' + __out.kaoguInMaster.length);
    lines.push(JSON.stringify(__out.kaoguInMaster));
    lines.push('');
    lines.push('=== user.log.mission 內 typeName=考古題 的 unit ===');
    lines.push('count: ' + __out.kaoguInLog.length);
    lines.push('first 5: ' + JSON.stringify(__out.kaoguInLog.slice(0, 5)));
    lines.push('');
    lines.push('=== user.subjects 內 typeName=考古題 的 unit ===');
    lines.push('count: ' + __out.kaoguInCollect.length);
    lines.push('first 5: ' + JSON.stringify(__out.kaoguInCollect.slice(0, 5)));
    lines.push('');
    lines.push('=== user.progress 內 typeName=考古題 的 unit ===');
    lines.push('count: ' + __out.kaoguInProgress.length);
    lines.push('first 5: ' + JSON.stringify(__out.kaoguInProgress.slice(0, 5)));
    lines.push('');
    lines.push('=== user.materials 內「考古題」type ===');
    lines.push('count: ' + __out.kaoguInMaterials.length);
    lines.push(JSON.stringify(__out.kaoguInMaterials));
    alert(lines.join('\n'));
} catch(e) {
    alert('ERROR: ' + e.message + '\n' + e.stack);
}
})();
