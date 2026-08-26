import sys
path = '/mnt/my_book/Denias/projects/learning-progress-board/index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """                    }
                } catch(e) {
                    console.error('v1.5.3: ❌ 備份復原失敗:', e);
                }
            }
        }

        // ============================================================
        // v1.5.4: 加地科 subject"""

new = """                    // v1.6.59: 麻辣甲單元任務unitId被錯寫成複習講義id，修復任務unitId
                    user.plans.forEach(function(plan) {
                        if (!plan.grid) return;
                        Object.keys(plan.grid).forEach(function(dStr) {
                            var tasks = plan.grid[dStr];
                            if (!Array.isArray(tasks)) return;
                            tasks.forEach(function(t) {
                                if (!t || !t.cat) return;
                                if (t.unitId === 'id_c9bxkq188') t.unitId = 'id_f5b8j07kd';
                                if (t.unitId === 'id_cf1tdcoxf') t.unitId = 'id_xb7foqf3b';
                            });
                        });
                    });
                } catch(e) {
                    console.error('v1.5.3: ❌ 備份復原失敗:', e);
                }
            }
        }

        // ============================================================
        // v1.5.4: 加地科 subject"""

if old not in content:
    print('ERROR: old text not found!')
    sys.exit(1)
else:
    content = content.replace(old, new, 1)
    print('OK: patched _v153RestoreFromBackup')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('SUCCESS')
