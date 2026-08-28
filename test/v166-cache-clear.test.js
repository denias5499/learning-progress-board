// test/v166-cache-clear.test.js -- v1.6.66 regression test
//
// v1.6.66 修的 bug:
// _collectSubjectUnitsCache 是 WeakMap, key 是 subject object reference
// 當 migration 跑完後, data 結構變了, 但 cache 還是用舊 reference 當 key
// 導致 buildMissionTree 拿到的 _collectSubjectUnits 結果是 migration 前的舊結果
//
// 修正: _v164Migrate 結尾清 _collectSubjectUnitsCache

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

test('v1.6.66: 清 _collectSubjectUnitsCache 後, buildMissionTree 拿到的 mTree 應該有正確的 units', () => {
    const win = loadIndex();
    const backup = JSON.parse(require('fs').readFileSync(
        '/mnt/my_book/Denias/.openclaw/workspace/.openclaw/tmp/backup_0030.json', 'utf8'
    ));
    const config = backup.keys.StudyMap_Family_Data_V20.config;
    win.appMaster = config.masters['會考複習'];
    win.multiData = {
        user_A: {
            masters: config.masters,
            missions: config.missions,
            plans: config.plans,
            logs: [],
            avatar: ''
        }
    };
    win.currentUserId = 'user_A';
    win.appMissions = config.missions;
    win.appPlans = config.plans;
    win.appLogs = [];
    win.appCurrentCat = '會考複習';

    // 第一次 buildMissionTree (cache 可能是舊的)
    const mTree1 = win.buildMissionTree('會考複習', '一模');
    const sTree1 = mTree1['國文'];
    if (!sTree1) {
        console.log('sTree1 is undefined, skipping');
        return;
    }
    const yimu_5shengjing = sTree1.items['複習講義|勝經'];
    const yimu_5_before = yimu_5shengjing ? yimu_5shengjing.length : 0;
    console.log('Before clear: 國文 勝經 =', yimu_5_before);

    // 模擬 v1.6.66 修法: 清 cache
    win._collectSubjectUnitsCache = new win.WeakMap();

    // 第二次 buildMissionTree (應該是 re-compute)
    const mTree2 = win.buildMissionTree('會考複習', '一模');
    const sTree2 = mTree2['國文'];
    if (!sTree2) {
        assert.fail('sTree2 is undefined after cache clear');
    }
    const yimu_5shengjing2 = sTree2.items['複習講義|勝經'];
    const yimu_5_after = yimu_5shengjing2 ? yimu_5shengjing2.length : 0;
    console.log('After clear: 國文 勝經 =', yimu_5_after);

    // 清 cache 後, 勝經 應該有 units (因為 一模 mission 包含 國文 勝經 unitIds)
    assert.ok(yimu_5_after > 0, `清 cache 後 勝經 應該有 units, 但只有 ${yimu_5_after}`);
});

test('v1.6.66: _v164Migrate 結尾應該清 _collectSubjectUnitsCache', () => {
    const fs = require('fs');
    const html = fs.readFileSync(
        '/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'utf8'
    );
    // 確認 _v164Migrate 結尾有清 cache
    assert.match(html, /_collectSubjectUnitsCache\s*=\s*new\s+WeakMap/,
        '_v164Migrate 結尾應該清 _collectSubjectUnitsCache');
});
