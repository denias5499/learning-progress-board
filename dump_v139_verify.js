// v139 verify: 在 runtime 直接呼叫 renderAeSubjectCardHtml 模擬 dropdown 輸出
;(function(){
  'use strict';
  var __out = {renderedLabels: [], defaultOrderIn: null, finalOrderedTypes: null, userKey: '', _deletedTypes: {}};
  try {
    var DATA = JSON.parse(localStorage.getItem('StudyMap_Family_Data_V20') || '{}');
    var keys = Object.keys(DATA);
    for (var i = 0; i < keys.length; i++) {
      if (DATA[keys[i]] && DATA[keys[i]].name === 'Denias') { __out.userKey = keys[i]; break; }
    }
    var user = DATA[__out.userKey] || {};
    __out._deletedTypes = user._deletedTypes || {};

    // 直接 invoke renderAeSubjectCardHtml with 模擬 subUnits
    if (typeof renderAeSubjectCardHtml !== 'function') {
      __out.error = 'renderAeSubjectCardHtml not a function';
      alert('ERROR: ' + JSON.stringify(__out));
      return;
    }

    // 模擬: 段考複習 / 公民 / 第一個 mission, subUnits 含「考古題」type (確認它會被過濾掉)
    var fakeSubUnits = [
      {sub:'公民', u:{name:'測試單元1'}, vol:'', typeName:'複習講義', instanceName:''},
      {sub:'公民', u:{name:'測試單元2'}, vol:'', typeName:'考古題', instanceName:''}
    ];
    var html = renderAeSubjectCardHtml('公民', fakeSubUnits, '段考複習', '第一次段考');

    // 用 regex 抓「教材類型:」後面所有 label text
    var typeSection = html.match(/教材類型:[\s\S]*?<\/div>/);
    if (typeSection) {
      var labels = typeSection[0].match(/>([^<>]{1,20})</g);
      if (labels) {
        __out.renderedLabels = labels.map(function(l){return l.replace(/[><]/g, '').trim();});
      }
    }
    __out.htmlLen = html.length;
    __out.htmlSnippet = html.slice(0, 300);

    alert('v139 verify done!\n\nUser _deletedTypes:\n' + JSON.stringify(__out._deletedTypes) +
          '\n\nRendered labels (教材類型):\n' + JSON.stringify(__out.renderedLabels) +
          '\n\nhtml snippet:\n' + __out.htmlSnippet);
  } catch(e) {
    alert('ERROR: ' + e.message + '\n' + e.stack);
  }
})();
