// v6 Safari 版 — 模擬完整 render path
// 修正: 1) 不再用 IIFE wrapper 內部 var (Safari hoisting 衝突)
//       2) 不用 copy() (Safari 沒 copy API), 改用 console.log + 把 JSON 印出來
;(function(){
  'use strict';
  var __safari_dump = {};
  try {
    var DATA = JSON.parse(localStorage.getItem('StudyMap_Family_Data_V20') || '{}');
    var USERKEY = '';
    var __keys = Object.keys(DATA);
    for (var ki = 0; ki < __keys.length; ki++) {
      var k = __keys[ki];
      if (DATA[k] && DATA[k].name === 'Denias') { USERKEY = k; break; }
    }
    if (!USERKEY) USERKEY = 'config';
    var USER = DATA[USERKEY] || {};
    __safari_dump.myUid = USERKEY;
    __safari_dump.userName = USER.name || '';

    function simCollect(s) {
      var collected = [];
      if (!s || !s.materials) return collected;
      var typeNames = Object.keys(s.materials);
      for (var ti = 0; ti < typeNames.length; ti++) {
        var typeName = typeNames[ti];
        var typeObj = s.materials[typeName];
        if (!typeObj || !Array.isArray(typeObj.instances)) continue;
        for (var ii = 0; ii < typeObj.instances.length; ii++) {
          var ins = typeObj.instances[ii];
          if (!ins) continue;
          if (ins.vols && typeof ins.vols === 'object') {
            var volOrder = ins.volOrder || Object.keys(ins.vols);
            for (var voi = 0; voi < volOrder.length; voi++) {
              var volName = volOrder[voi];
              var volUnits = ins.vols[volName] || [];
              for (var vui = 0; vui < volUnits.length; vui++) {
                var u = volUnits[vui];
                if (u && u.id) collected.push({id: u.id, _typeName: typeName, _instanceName: ins.name, vol: volName});
              }
            }
          }
          if (Array.isArray(ins.units)) {
            for (var ui = 0; ui < ins.units.length; ui++) {
              var uu = ins.units[ui];
              if (uu && uu.id) collected.push({id: uu.id, _typeName: typeName, _instanceName: ins.name});
            }
          }
        }
      }
      return collected;
    }

    __safari_dump.totalCollectTypeNameCount = {};
    var catKeys = Object.keys(USER.masters || {});
    for (var ci = 0; ci < catKeys.length; ci++) {
      var cat = catKeys[ci];
      var subKeys = Object.keys(USER.masters[cat] || {});
      for (var si = 0; si < subKeys.length; si++) {
        var sub = subKeys[si];
        var units = simCollect(USER.masters[cat][sub]);
        for (var ui2 = 0; ui2 < units.length; ui2++) {
          var u2 = units[ui2];
          __safari_dump.totalCollectTypeNameCount[u2._typeName] = (__safari_dump.totalCollectTypeNameCount[u2._typeName] || 0) + 1;
        }
      }
    }

    __safari_dump.renderTypeCountByMis = {};
    __safari_dump.missionsWithKaogu = [];
    __safari_dump.maxKaoguCount = 0;

    for (var ci2 = 0; ci2 < catKeys.length; ci2++) {
      var cat2 = catKeys[ci2];
      var lookup = {};
      var subKeys2 = Object.keys(USER.masters[cat2] || {});
      for (var si2 = 0; si2 < subKeys2.length; si2++) {
        var sub2 = subKeys2[si2];
        var units2 = simCollect(USER.masters[cat2][sub2]);
        for (var ui3 = 0; ui3 < units2.length; ui3++) {
          var u3 = units2[ui3];
          var key = u3.id;
          lookup[key] = {sub: sub2, id: u3.id, _typeName: u3._typeName, _instanceName: u3._instanceName, vol: u3.vol};
        }
      }
      var catMissions = (USER.missions && USER.missions[cat2]) || {};
      var misKeys = Object.keys(catMissions);
      for (var mi = 0; mi < misKeys.length; mi++) {
        var mis = misKeys[mi];
        var refs = catMissions[mis] || [];
        var mTree = {};
        for (var ri = 0; ri < refs.length; ri++) {
          var uid = refs[ri];
          var info = lookup[uid];
          if (!info) continue;
          if (!mTree[info.sub]) mTree[info.sub] = {type: 'materials', items: {}};
          var volKey = info.vol || 'custom';
          if (!mTree[info.sub].items[volKey]) mTree[info.sub].items[volKey] = [];
          mTree[info.sub].items[volKey].push({id: info.id, _typeName: info._typeName, _instanceName: info._instanceName, vol: volKey});
        }
        var subjectData = {};
        var mTreeKeys = Object.keys(mTree);
        for (var mtki = 0; mtki < mTreeKeys.length; mtki++) {
          var sub3 = mTreeKeys[mtki];
          var sTree = mTree[sub3], subUnits = [];
          var volKeys = Object.keys(sTree.items);
          for (var vki = 0; vki < volKeys.length; vki++) {
            var vol = volKeys[vki];
            var arr = sTree.items[vol];
            for (var ai = 0; ai < arr.length; ai++) {
              var u4 = arr[ai];
              subUnits.push({sub: sub3, u: u4, vol: vol, typeName: u4._typeName || '', instanceName: u4._instanceName || ''});
            }
          }
          if (subUnits.length > 0) subjectData[sub3] = subUnits;
        }
        var perSub = {};
        var sdKeys = Object.keys(subjectData);
        for (var sdi = 0; sdi < sdKeys.length; sdi++) {
          var sub4 = sdKeys[sdi];
          var typeCount = {};
          var sdArr = subjectData[sub4];
          for (var sai = 0; sai < sdArr.length; sai++) {
            var x = sdArr[sai];
            var t = x.typeName || '(未分類)';
            typeCount[t] = (typeCount[t] || 0) + 1;
          }
          perSub[sub4] = typeCount;
        }
        __safari_dump.renderTypeCountByMis[cat2] = __safari_dump.renderTypeCountByMis[cat2] || {};
        __safari_dump.renderTypeCountByMis[cat2][mis] = perSub;
        var psk = Object.keys(perSub);
        for (var pki = 0; pki < psk.length; pki++) {
          var sub5 = psk[pki];
          var tc = perSub[sub5];
          if ((tc['考古題'] || 0) > 0) {
            __safari_dump.missionsWithKaogu.push(cat2 + ' / ' + mis + ' / ' + sub5 + ' = ' + tc['考古題']);
            if (tc['考古題'] > __safari_dump.maxKaoguCount) __safari_dump.maxKaoguCount = tc['考古題'];
          }
        }
      }
    }

    __safari_dump.default5Collect = {};
    var d5 = ['複習講義','複習卷','數字題本','模擬題本','考古題'];
    for (var d5i = 0; d5i < d5.length; d5i++) {
      var t5 = d5[d5i];
      __safari_dump.default5Collect[t5] = __safari_dump.totalCollectTypeNameCount[t5] || 0;
    }

    __safari_dump._deletedTypes = USER._deletedTypes || {};

    // Safari 安全: 用 console.log + 把 JSON 印出來 + 顯示在 console (用戶可手動 copy)
    console.log('====== DUMP v6 結果 ======');
    console.log(JSON.stringify(__safari_dump, null, 2));
    console.log('====== 摘要 ======');
    console.log('myUid: ' + __safari_dump.myUid);
    console.log('kaoguInCollect: ' + (__safari_dump.totalCollectTypeNameCount['考古題'] || 0));
    console.log('missionsWithKaogu: ' + __safari_dump.missionsWithKaogu.length);
    console.log('maxKaoguCount: ' + __safari_dump.maxKaoguCount);
    console.log('default5Collect: ' + JSON.stringify(__safari_dump.default5Collect));
    console.log('deletedMarkerCount: ' + Object.keys(__safari_dump._deletedTypes).length);
    console.log('missionsWithKaogu first 10: ' + JSON.stringify(__safari_dump.missionsWithKaogu.slice(0, 10)));
    console.log('====== END ======');
    alert('v6 done! kaoguInCollect=' + (__safari_dump.totalCollectTypeNameCount['考古題'] || 0) +
          ', missionsWithKaogu=' + __safari_dump.missionsWithKaogu.length +
          ', maxCount=' + __safari_dump.maxKaoguCount +
          ', default5=' + JSON.stringify(__safari_dump.default5Collect) +
          '\n\n完整 JSON 已在 console,請把整段 console output 截圖/複製給我看');
  } catch(e) {
    alert('ERROR: ' + e.message + '\n' + e.stack);
  }
})();