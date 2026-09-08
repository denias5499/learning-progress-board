// v1.6.135.1: avatar base64 不該當 emoji 顯示
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v135.1: avatar base64 不塞 textContent', () => {
    // 用 vm 跑 getCurrentUser, 餵 base64 avatar
    const fnMatch = WN.match(/function getCurrentUser\(\)\s*\{[\s\S]*?\n    \}/);
    assert.ok(fnMatch);
    
    const base64Avatar = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAA';
    
    const sandbox = {
        localStorage: {
            _data: {
                'StudyMap_CurrentUserId_V20': 'user_A',
                'StudyMap_Family_Data_V20': JSON.stringify({
                    'user_A': { name: '學生 A', avatar: base64Avatar }
                })
            },
            getItem(k) { return this._data[k] || null; },
            setItem(k, v) { this._data[k] = v; }
        },
        JSON, console: { log(){}, error(){}, warn(){} },
        Object, Array, String
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0] + '\nvar result = getCurrentUser();', sandbox);
    
    assert.equal(sandbox.result.name, '學生 A', 'name 應正確');
    assert.notEqual(sandbox.result.emoji.indexOf('data:image'), 0, 'emoji 不應是 base64');
    assert.equal(sandbox.result.emoji, '👤', 'avatar 是 base64 時應 fallback 👤');
});

test('v135.1: avatar 是 emoji 字串時正常顯示', () => {
    const fnMatch = WN.match(/function getCurrentUser\(\)\s*\{[\s\S]*?\n    \}/);
    
    const sandbox = {
        localStorage: {
            _data: {
                'StudyMap_CurrentUserId_V20': 'user_B',
                'StudyMap_Family_Data_V20': JSON.stringify({
                    'user_B': { name: '學生 B', avatar: '👧' }
                })
            },
            getItem(k) { return this._data[k] || null; },
            setItem(k, v) { this._data[k] = v; }
        },
        JSON, console: { log(){}, error(){}, warn(){} },
        Object, Array, String
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0] + '\nvar result = getCurrentUser();', sandbox);
    
    assert.equal(sandbox.result.emoji, '👧', 'emoji avatar 應保留');
});
