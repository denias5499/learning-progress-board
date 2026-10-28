/* Non-mutating mission selection for the tree. */
(function(root){
 'use strict';
 function filterSubject(subject,allowed){
  if(!subject)return {};
  if(!allowed)return subject;
  function keep(units){return (units||[]).filter(function(u){return u&&allowed.has(u.id);});}
  function volumes(source){var out={};Object.keys(source||{}).forEach(function(v){var units=keep(source[v]);if(units.length)out[v]=units;});return out;}
  var copy=Object.assign({},subject);
  if(subject.materials){copy.materials={};Object.keys(subject.materials).forEach(function(type){var m=subject.materials[type];if(!m)return;var instances=(m.instances||[]).filter(Boolean).map(function(inst){var c=Object.assign({},inst,{units:keep(inst.units),vols:volumes(inst.vols)});if(inst.volOrder)c.volOrder=inst.volOrder.filter(function(v){return !!c.vols[v];});return c;}).filter(function(inst){return inst.units.length||Object.keys(inst.vols).length;});if(instances.length)copy.materials[type]=Object.assign({},m,{instances:instances});});}
  if(subject.vols){copy.vols=volumes(subject.vols);if(subject.volOrder)copy.volOrder=subject.volOrder.filter(function(v){return !!copy.vols[v];});}
  if(Array.isArray(subject.units))copy.units=keep(subject.units);
  return copy;
 }
 var api={filterSubject:filterSubject};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TreeScope=api;
})(typeof window!=='undefined'?window:globalThis);
