// v7: 抓 dropdown DOM 真實狀態 — 確認「考古題」tab 是 enabled 還是 disabled
;(function(){
  'use strict';
  var __dump = {btns: [], kaoguBtn: null, userKey: '', _deletedTypes: {}};
  try {
    // 找 user key
    var DATA = JSON.parse(localStorage.getItem('StudyMap_Family_Data_V20') || '{}');
    var keys = Object.keys(DATA);
    for (var i = 0; i < keys.length; i++) {
      if (DATA[keys[i]] && DATA[keys[i]].name === 'Denias') { __dump.userKey = keys[i]; break; }
    }
    var user = DATA[__dump.userKey] || {};
    __dump._deletedTypes = user._deletedTypes || {};

    // 找所有 button, 篩選 textContent 含「考古」或「考古題」的
    var allBtns = document.querySelectorAll('button');
    var kaoguBtns = [];
    var allTabBtns = [];
    for (var bi = 0; bi < allBtns.length; bi++) {
      var b = allBtns[bi];
      var txt = (b.textContent || '').trim();
      if (!txt) continue;
      var cs = window.getComputedStyle(b);
      var info = {
        text: txt.slice(0, 30),
        disabled: b.disabled,
        className: b.className,
        opacity: cs.opacity,
        cursor: cs.cursor,
        bgColor: cs.backgroundColor,
        color: cs.color,
        hasDisabledClass: /disabled|無|空/.test(b.className) || b.disabled
      };
      if (/考古/.test(txt)) kaoguBtns.push(info);
      if (/考古|複習|數字|模擬|題本/.test(txt) && txt.length < 15) allTabBtns.push(info);
    }
    __dump.kaoguBtn = kaoguBtns;
    __dump.allTabBtns = allTabBtns.slice(0, 10);

    // 找 onclick 或 data-* 屬性
    if (kaoguBtns.length > 0) {
      var btn = null;
      for (var fi = 0; fi < allBtns.length; fi++) {
        if (/考古/.test(allBtns[fi].textContent || '')) { btn = allBtns[fi]; break; }
      }
      if (btn) {
        __dump.kaoguBtnAttrs = {
          onclick: btn.getAttribute('onclick'),
          dataType: btn.getAttribute('data-type'),
          dataTab: btn.getAttribute('data-tab'),
          outerHTML: btn.outerHTML.slice(0, 300)
        };
      }
    }

    console.log('====== DUMP v7 DOM ======');
    console.log(JSON.stringify(__dump, null, 2));
    console.log('====== END ======');
    alert('v7 done! kaoguBtns=' + kaoguBtns.length + ', allTabs=' + allTabBtns.length +
          '\n\n考古題 btn 狀態:\n' + (kaoguBtns.length > 0 ?
            'cursor=' + kaoguBtns[0].cursor + '\ndisabled=' + kaoguBtns[0].disabled + '\nclassName=' + kaoguBtns[0].className + '\nbgColor=' + kaoguBtns[0].bgColor :
            'NOT FOUND'));
  } catch(e) {
    alert('ERROR: ' + e.message + '\n' + e.stack);
  }
})();
