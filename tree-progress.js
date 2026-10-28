/* Read-only tree progress: completed page ranges are clipped and merged per unit. */
(function(root) {
    'use strict';
    function range(start, end) {
        if (start === '' || start == null || end === '' || end == null) return null;
        start = Number(start); end = Number(end);
        return Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start ? [start, end] : null;
    }
    function size(ranges) {
        var sorted = ranges.slice().sort(function(a,b) { return a[0]-b[0]; }), total = 0, last = null;
        sorted.forEach(function(r) {
            if (!last || r[0] > last[1]+1) { if (last) total += last[1]-last[0]+1; last = r.slice(); }
            else last[1] = Math.max(last[1], r[1]);
        });
        return total + (last ? last[1]-last[0]+1 : 0);
    }
    function create(subject, allUnits, plans, context) {
        context = context || {};
        function meta(u) {
            var type = u._typeName || '', instance = u._instanceName || '';
            var vol = u.vol || '';
            if (vol === 'custom' || vol === type+'|'+instance) vol = '';
            return { type: type, instance: instance, vol: vol,
                unitBased: !!(subject.materials && subject.materials[type] && subject.materials[type].unitBased === true) };
        }
        function book(u) { var m = meta(u); return JSON.stringify([m.type,m.instance,m.vol]); }
        function key(u) { return JSON.stringify([book(u),u.id]); }
        var tasks = [];
        (plans || []).forEach(function(plan) {
            Object.keys(plan.grid || {}).forEach(function(day) {
                (plan.grid[day] || []).forEach(function(t) {
                    if (!t || !t.isDone || !t.unitId) return;
                    if (t.subject && context.subject && t.subject !== context.subject) return;
                    if (t.cat && context.category && t.cat !== context.category) return;
                    var candidates = allUnits.filter(function(u) {
                        var m = meta(u);
                        var taskVol = t.vol;
                        if (taskVol === 'custom' || taskVol === m.type+'|'+m.instance) taskVol = '';
                        return u.id === t.unitId && (!t.typeName || t.typeName === m.type) &&
                            (!t.instanceName || t.instanceName === m.instance) && (!taskVol || taskVol === m.vol);
                    });
                    var books = new Set(candidates.map(book));
                    if (books.size !== 1) return; // Unknown/ambiguous ownership must not credit another book.
                    tasks.push({ task: t, book: book(candidates[0]) });
                });
            });
        });
        function unit(u) {
            if (!u._typeName && !u.vol) {
                var matching = allUnits.filter(function(other) { return other.id === u.id; });
                if (matching.length === 1) u = matching[0];
            }
            var m = meta(u), bounds = range(u.start,u.end);
            if (m.unitBased) return { basis:'unit', total:1, done:tasks.some(function(r) { return r.book === book(u) && r.task.unitId === u.id; }) ? 1 : 0 };
            if (!bounds) return { basis:'missing', total:0, done:0 };
            var intervals = [];
            tasks.forEach(function(r) {
                if (r.book !== book(u)) return;
                var done = range(r.task.startPage,r.task.endPage);
                if (!done) return;
                var start = Math.max(bounds[0],done[0]), end = Math.min(bounds[1],done[1]);
                if (end >= start) intervals.push([start,end]);
            });
            return { basis:'page', total:bounds[1]-bounds[0]+1, done:size(intervals) };
        }
        function summary(units) {
            var result = { pages:0, donePages:0, units:0, doneUnits:0, missing:0 }, seen = new Set();
            units.forEach(function(u) {
                if (seen.has(key(u))) return; seen.add(key(u));
                var value = unit(u);
                if (value.basis === 'page') { result.pages += value.total; result.donePages += value.done; }
                else if (value.basis === 'unit') { result.units++; result.doneUnits += value.done; }
                else result.missing++;
            });
            return result;
        }
        return { unit:unit, summary:summary };
    }
    var api = { create:create };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.TreePageProgress = api;
})(typeof window !== 'undefined' ? window : globalThis);
