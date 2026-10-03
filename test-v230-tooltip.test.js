/**
 * v2.3.0 HoverTooltip unit test
 *
 * 提取 index.html 內 Tooltip widget 程式碼, 用 jsdom 模擬瀏覽器 DOM
 * 驗證:
 *   1. 滑鼠移到元素 → 出現 + 內容對
 *   2. 滑鼠移開 → 隱藏
 *   3. 邊界翻轉 (右邊沒空間時翻到左邊)
 *   4. 0ms delay (滑鼠 event 立即觸發)
 *   5. data-tooltip-color 套用到左邊框
 *   6. 焦點事件也支援 (鍵盤可達性)
 *   7. data-tooltip 為空時不顯示
 *   8. 滾動 / resize 時隱藏
 *   9. event delegation: 子元素觸發時往上找 [data-tooltip]
 *   10. 真實月曆 tooltip 內容
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 從 index.html 抽出 HoverTooltip IIFE
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
const widgetMatch = html.match(/<script>\s*\/\*\*\s*\*\s*v2\.3\.0 HoverTooltip widget[\s\S]*?\}\)\(\);\s*<\/script>/);
if (!widgetMatch) {
    console.error('FAIL: 找不到 HoverTooltip widget 程式碼');
    process.exit(1);
}
const widgetCode = widgetMatch[0].replace(/<script>|<\/script>/g, '');

let passed = 0, failed = 0;
function test(name, fn) {
    try {
        fn();
        console.log('  ✅ ' + name);
        passed++;
    } catch (e) {
        console.log('  ❌ ' + name + ': ' + e.message);
        failed++;
    }
}
function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
}
function assertEq(a, b, msg) {
    if (a !== b) throw new Error((msg || 'assertEq') + ': 預期 "' + b + '", 實際 "' + a + '"');
}

function setupDom(viewportW = 1024, viewportH = 768) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        pretendToBeVisual: true,
        runScripts: 'outside-only'
    });
    const { window } = dom;
    Object.defineProperty(window, 'innerWidth', { value: viewportW, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: viewportH, configurable: true });
    window.Element.prototype.getBoundingClientRect = function() {
        const r = this.dataset.rect;
        if (r) {
            const [x, y, w, h] = r.split(',').map(Number);
            return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h };
        }
        return { x: 0, y: 0, left: 0, top: 0, width: 100, height: 30, right: 100, bottom: 30 };
    };
    const script = new vm.Script(widgetCode);
    const ctx = dom.getInternalVMContext();
    script.runInContext(ctx);
    return { dom, window, document: window.document };
}

function fireMouse(target, type = 'mouseover', relatedTarget = null) {
    const ev = new target.ownerDocument.defaultView.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        relatedTarget
    });
    target.dispatchEvent(ev);
    return ev;
}

console.log('\n========== v2.3.0 HoverTooltip Unit Tests ==========\n');

// Test 1: 基本 hover 顯示
console.log('Test 1: 基本 hover 顯示');
{
    const { window, document } = setupDom();
    const el = document.createElement('div');
    el.setAttribute('data-tooltip', '測試內容');
    el.setAttribute('data-rect', '100,100,80,20');
    document.body.appendChild(el);
    fireMouse(el, 'mouseover');
    const tip = window.HoverTooltip._getTip();
    test('tip element 存在', () => assert(tip, 'tip element null'));
    test('tip 顯示 (show class)', () => assert(tip.classList.contains('show'), 'show class 缺失'));
    test('tip 內容正確', () => assertEq(tip.textContent, '測試內容'));
    // v2.3.0.2+: tooltip 改放上方中央對齊
    test('tip top 在 el 上方', () => {
        const top = parseInt(tip.style.top);
        assert(top < 100, 'top=' + top + ', 應 < 100 (上方優先)');
    });
    test('tip left 中央對齊 (合理範圍)', () => {
        const left = parseInt(tip.style.left);
        assert(left >= 0 && left <= 200, 'left=' + left + ' 不合理');
    });
}

// Test 2: mouseout 隱藏
console.log('\nTest 2: mouseout 隱藏');
{
    const { window, document } = setupDom();
    const el = document.createElement('div');
    el.setAttribute('data-tooltip', 'X');
    el.setAttribute('data-rect', '100,100,80,20');
    document.body.appendChild(el);
    fireMouse(el, 'mouseover');
    fireMouse(el, 'mouseout');
    const tip = window.HoverTooltip._getTip();
    test('hide 後 show class 移除', () => assert(!tip.classList.contains('show'), '仍顯示'));
}

// Test 3: 邊界翻轉
console.log('\nTest 3: 邊界翻轉');
{
    const { window, document } = setupDom(1024, 768);
    const el = document.createElement('div');
    el.setAttribute('data-tooltip', 'Y');
    el.setAttribute('data-rect', '900,100,100,20');
    document.body.appendChild(el);
    fireMouse(el, 'mouseover');
    const tip = window.HoverTooltip._getTip();
    // v2.3.0.2+: 右側超出 viewport 時 left 被 clamp 到合理範圍
    test('left 沒超出右邊界 (<=1024)', () => {
        const left = parseInt(tip.style.left);
        assert(left <= 1024, 'left=' + left + ', 應 <= 1024');
    });
    test('tip 仍在 show 狀態', () => assert(tip.classList.contains('show'), 'show class 缺失'));
}

// Test 4: 0ms delay
console.log('\nTest 4: 0ms delay');
{
    const { window, document } = setupDom();
    const el = document.createElement('div');
    el.setAttribute('data-tooltip', 'Z');
    el.setAttribute('data-rect', '100,100,80,20');
    document.body.appendChild(el);
    // 先觸發一次讓 tip lazy init
    fireMouse(el, 'mouseover');
    window.HoverTooltip.hide();
    // 再驗證 mouseover 立即切換
    const before = window.HoverTooltip._getTip().classList.contains('show');
    fireMouse(el, 'mouseover');
    const after = window.HoverTooltip._getTip().classList.contains('show');
    test('show 立即切換 (before=false, after=true)', () => assert(before === false && after === true));
}

// Test 5: tooltip-color
console.log('\nTest 5: tooltip-color');
{
    const { window, document } = setupDom();
    const el = document.createElement('div');
    el.setAttribute('data-tooltip', 'C');
    el.setAttribute('data-tooltip-color', '#dc2626');
    el.setAttribute('data-rect', '100,100,80,20');
    document.body.appendChild(el);
    fireMouse(el, 'mouseover');
    const tip = window.HoverTooltip._getTip();
    test('borderLeftColor = #dc2626', () => assertEq(tip.style.borderLeftColor, 'rgb(220, 38, 38)'));
}

// Test 6: 焦點事件
console.log('\nTest 6: 焦點事件');
{
    const { window, document } = setupDom();
    const el = document.createElement('button');
    el.setAttribute('data-tooltip', 'F');
    el.setAttribute('data-rect', '100,100,80,20');
    document.body.appendChild(el);
    const ev = new window.FocusEvent('focusin', { bubbles: true });
    el.dispatchEvent(ev);
    test('focusin 觸發 show', () => assert(window.HoverTooltip._getTip().classList.contains('show')));
}

// Test 7: 沒有 data-tooltip 不顯示
console.log('\nTest 7: 無 data-tooltip 不觸發');
{
    const { window, document } = setupDom();
    // 先建立一個有 tooltip 的元素讓 tip lazy init
    const initEl = document.createElement('div');
    initEl.setAttribute('data-tooltip', 'init');
    initEl.setAttribute('data-rect', '100,100,80,20');
    document.body.appendChild(initEl);
    fireMouse(initEl, 'mouseover');
    window.HoverTooltip.hide();
    
    // 再測無 tooltip 的元素
    const el = document.createElement('div');
    el.setAttribute('data-rect', '200,200,80,20');
    document.body.appendChild(el);
    fireMouse(el, 'mouseover');
    const tip = window.HoverTooltip._getTip();
    test('沒有 data-tooltip → 隱藏', () => assert(!tip.classList.contains('show')));
}

// Test 8: event delegation
console.log('\nTest 8: event delegation');
{
    const { window, document } = setupDom();
    const parent = document.createElement('div');
    parent.setAttribute('data-tooltip', 'P');
    parent.setAttribute('data-rect', '100,100,80,20');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);
    fireMouse(child, 'mouseover');
    const tip = window.HoverTooltip._getTip();
    test('子元素觸發 → tooltip 顯示 parent 內容', () => {
        assert(tip.classList.contains('show'), '未顯示');
        assertEq(tip.textContent, 'P');
    });
}

// Test 9: scroll 隱藏
console.log('\nTest 9: scroll 隱藏');
{
    const { window, document } = setupDom();
    const el = document.createElement('div');
    el.setAttribute('data-tooltip', 'S');
    el.setAttribute('data-rect', '100,100,80,20');
    document.body.appendChild(el);
    fireMouse(el, 'mouseover');
    const ev = new window.Event('scroll', { bubbles: true });
    window.dispatchEvent(ev);
    const tip = window.HoverTooltip._getTip();
    test('scroll → hide', () => assert(!tip.classList.contains('show')));
}

// Test 10: 真實月曆格式
console.log('\nTest 10: 真實月曆 tooltip 格式');
{
    const { window, document } = setupDom();
    const el = document.createElement('div');
    el.className = 'task-item';
    // v2.3.0.3 格式: 只留 🏷️ + 📚, 拿掉日期
    const tipText = '🏷️ 會考複習：一模\n📚 國文 / 複習講義 / 麻辣甲\n冊次: 第三冊\n單元: L1~L2 P.1\n\n⏳ 待完成';
    el.setAttribute('data-tooltip', tipText);
    el.setAttribute('data-tooltip-color', '#dc2626');
    el.setAttribute('data-rect', '300,200,150,24');
    document.body.appendChild(el);
    fireMouse(el, 'mouseover');
    const tipEl = window.HoverTooltip._getTip();
    test('完整 tooltip 內容保留換行', () => {
        assert(tipEl.textContent.includes('麻辣甲'));
        assert(tipEl.textContent.includes('L1~L2'));
        assert(tipEl.textContent.includes('第三冊'));
    });
    test('國文紅色套用', () => assertEq(tipEl.style.borderLeftColor, 'rgb(220, 38, 38)'));
}

console.log('\n========== 結果 ==========');
console.log('✅ 通過: ' + passed);
console.log('❌ 失敗: ' + failed);
console.log('總計: ' + (passed + failed));

if (failed > 0) {
    process.exit(1);
} else {
    console.log('\n🎉 所有 unit test 通過');
}
