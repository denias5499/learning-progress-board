// v140 debug v8: 從 raw.config 拿真實 Denias 資料
;(function(){
var __out = new Object();
__out.userKey = 'StudyMap_Family_Data_V20 > config';
__out.deletedTypes = {};
__out.kaoguInMaster = [];
__out.kaoguInLog = [];
__out.kaoguInCollect = [];
__out.kaoguInProgress = [];
__out.kaoguInMaterials = [];
__out.kaoguInConfig = [];
__out.subjectsTopKeys = [];
__out.logsTopKeys = [];
try {
    var raw = JSON.parse(localStorage.getItem('StudyMap_Family_Data_V20') || '{}');
    if (raw.config) {
        __out.subjectsTopKeys = Object.keys(raw.config);
    }
    if (raw.logs) {
        __out.logsTopKeys = Object.keys(raw.logs);
    }
    var user = raw.config;
    if (!user) {
        alert('ERROR: raw.config 不存在\n\nraw keys: ' + JSON.stringify(Object.keys(raw)));
        return;
    }
    __out.userName = user.name;
    __out.deletedTypes = user._deletedTypes || {};

    // 1. 掃 user.masters
    function scanMaster(cat, catObj) {
        if (!catObj) return;
        Object.keys(catObj).forEach(function(sub){
            var subj = catObj[sub];
            if (!subj || !subj.materials) return;
            if (subj.materials['考古題']) {
                __out.kaoguInMaster.push(cat + ' > ' + sub);
            }
        });
    }
    // 2. log.mission
    function scanLogMission(cat, catObj) {
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
    }
    // 3. subjects
    function scanSubjects(cat, catObj) {
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
    }
    // 4. progress
    function scanProgress(cat, catObj) {
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
    }
    // 5. materials
    function scanMaterials(cat, catObj) {
        if (!catObj) return;
        Object.keys(catObj).forEach(function(sub){
            var subj = catObj[sub];
            if (!subj || !subj.materials) return;
            if (subj.materials['考古題']) {
                __out.kaoguInMaterials.push(cat + ' > ' + sub);
            }
        });
    }
    // 6. config 內直接有 materials
    if (user.materials) {
        Object.keys(user.materials).forEach(function(cat){
            scanMaterials(cat, user.materials[cat]);
        });
    }
    if (user.masters) {
        Object.keys(user.masters).forEach(function(cat){
            scanMaster(cat, user.masters[cat]);
        });
    }
    if (user.log && user.log.mission) {
        Object.keys(user.log.mission).forEach(function(cat){
            scanLogMission(cat, user.log.mission[cat]);
        });
    }
    if (user.subjects) {
        Object.keys(user.subjects).forEach(function(cat){
            scanSubjects(cat, user.subjects[cat]);
        });
    }
    if (user.progress) {
        Object.keys(user.progress).forEach(function(cat){
            scanProgress(cat, user.progress[cat]);
        });
    }

    var lines = [];
    lines.push('=== user identity ===');
    lines.push('name: ' + __out.userName);
    lines.push('config top keys: ' + JSON.stringify(__out.subjectsTopKeys));
    lines.push('logs top keys: ' + JSON.stringify(__out.logsTopKeys));
    lines.push('_deletedTypes: ' + JSON.stringify(__out.deletedTypes));
    lines.push('');
    lines.push('=== 考古題 來源統計 ===');
    lines.push('user.materials 內: ' + __out.kaoguInMaterials.length);
    lines.push('user.masters 內: ' + __out.kaoguInMaster.length);
    lines.push('user.subjects 內: ' + __out.kaoguInCollect.length);
    lines.push('user.progress 內: ' + __out.kaoguInProgress.length);
    lines.push('user.log.mission 內: ' + __out.kaoguInLog.length);
    lines.push('');
    if (__out.kaoguInMaster.length > 0) lines.push('masters: ' + JSON.stringify(__out.kaoguInMaster.slice(0,10)));
    if (__out.kaoguInMaterials.length > 0) lines.push('materials: ' + JSON.stringify(__out.kaoguInMaterials.slice(0,10)));
    if (__out.kaoguInCollect.length > 0) lines.push('subjects first 10: ' + JSON.stringify(__out.kaoguInCollect.slice(0,10)));
    if (__out.kaoguInProgress.length > 0) lines.push('progress first 10: ' + JSON.stringify(__out.kaoguInProgress.slice(0,10)));
    if (__out.kaoguInLog.length > 0) lines.push('log.mission first 10: ' + JSON.stringify(__out.kaoguInLog.slice(0,10)));
    alert(lines.join('\n'));
} catch(e) {
    alert('ERROR: ' + e.message + '\n' + e.stack);
}
})();
