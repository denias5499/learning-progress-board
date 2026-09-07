"""
v1.6.134: getSyllabusDB() 修攤平邏輯 — 處理真實 master 結構
masters[cat][subj].materials[typeName].instances[].{name, units[], vols[vol][]}

Denias 測試結果:
- 教材類型只有「其他」→ 沒處理 .materials[typeName] 那層
- 教材名稱顯示「materials」→ 直接拿 materials 這個 key 當 instance
- 單元空白 → 沒處理 instances[].units

正確攤平:
  flat[subj][typeName][instanceName] = [unitName1, unitName2, ...]
  其中 typeName 從 materials 的 key 取
  instanceName 從 instances[].name 取
  units 從 instances[].units[] 或 vols[vol][] 攤平
"""
with open('wrong-notes/index.html', 'r') as f:
    c = f.read()

old = '''var masters = user.masters || {};
                // 攤平 cat > subject > instanceId
                var flat = {};
                Object.keys(masters).forEach(function(cat) {
                    Object.keys(masters[cat] || {}).forEach(function(subj) {
                        if (!flat[subj]) flat[subj] = {};
                        Object.keys(masters[cat][subj] || {}).forEach(function(insId) {
                            var inst = masters[cat][subj][insId];
                            var typeName = inst.typeName || '其他';
                            var instName = inst.instanceName || insId;
                            if (!flat[subj][typeName]) flat[subj][typeName] = {};
                            var units = (inst.units || []).map(function(u) {
                                return typeof u === 'string' ? u : (u.name || u.id || '');
                            });
                            flat[subj][typeName][instName] = units;
                        });
                    });
                });
                if (Object.keys(flat).length > 0) return flat;
                // 攤平 subject > instanceId (舊 v20 結構, 沒 cat 分類)
                var tree = {};
                Object.keys(masters).forEach(function(subj) {
                    tree[subj] = {};
                    Object.keys(masters[subj]).forEach(function(insId) {
                        var inst = masters[subj][insId];
                        var typeName = inst.typeName || '其他';
                        var instName = inst.instanceName || insId;
                        if (!tree[subj][typeName]) tree[subj][typeName] = {};
                        var units = (inst.units || []).map(function(u) {
                            return typeof u === 'string' ? u : (u.name || u.id || '');
                        });
                        tree[subj][typeName][instName] = units;
                    });
                });
                if (Object.keys(tree).length > 0) return tree;'''

new = '''var masters = user.masters || {};
                // v1.6.134: 處理真實 master 結構
                // masters[cat][subj].materials[typeName].instances[].{name, units[], vols[]}
                var flat = {};
                var hasData = false;
                Object.keys(masters).forEach(function(cat) {
                    Object.keys(masters[cat] || {}).forEach(function(subj) {
                        var subData = masters[cat][subj];
                        if (!subData) return;
                        if (!flat[subj]) flat[subj] = {};
                        // v1.6.134: 新結構 — 有 .materials[typeName]
                        if (subData.materials && typeof subData.materials === 'object') {
                            Object.keys(subData.materials).forEach(function(typeName) {
                                var typeObj = subData.materials[typeName];
                                if (!typeObj || !typeObj.instances) return;
                                if (!flat[subj][typeName]) flat[subj][typeName] = {};
                                typeObj.instances.forEach(function(ins) {
                                    if (!ins) return;
                                    var instName = ins.name || '(未命名)';
                                    // 收集 units: 直接 units[] + vols[vol][] 攤平
                                    var units = [];
                                    (ins.units || []).forEach(function(u) {
                                        var label = typeof u === 'string' ? u : (u.name || u.id || '');
                                        if (label) units.push(label);
                                    });
                                    Object.keys(ins.vols || {}).forEach(function(volName) {
                                        (ins.vols[volName] || []).forEach(function(u) {
                                            var label = typeof u === 'string' ? u : (u.name || u.id || '');
                                            if (label) units.push(volName + ' / ' + label);
                                        });
                                    });
                                    flat[subj][typeName][instName] = units;
                                    hasData = true;
                                });
                            });
                        } else {
                            // 舊結構 (沒 .materials): 直接 masters[cat][subj][insId]
                            Object.keys(subData).forEach(function(insId) {
                                var inst = subData[insId];
                                var typeName = inst.typeName || '其他';
                                var instName = inst.instanceName || insId;
                                if (!flat[subj][typeName]) flat[subj][typeName] = {};
                                var units = (inst.units || []).map(function(u) {
                                    return typeof u === 'string' ? u : (u.name || u.id || '');
                                });
                                flat[subj][typeName][instName] = units;
                                hasData = true;
                            });
                        }
                    });
                });
                if (hasData) return flat;'''

assert old in c, 'old getSyllabusDB not found'
c = c.replace(old, new)

# title
c = c.replace('[v1.6.133]', '[v1.6.134]', 1)
with open('index.html', 'r') as f:
    idx = f.read()
idx = idx.replace('[v1.6.133]', '[v1.6.134]', 1)
with open('index.html', 'w') as f:
    f.write(idx)

with open('wrong-notes/index.html', 'w') as f:
    f.write(c)
print('OK')
