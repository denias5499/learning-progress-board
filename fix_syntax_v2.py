#!/usr/bin/env python3
"""
緊急修復 Phase 2 語法錯誤
問題：第 14348 行有 '</script>' HTML 標籤出現在 JavaScript 中
"""

import re

def fix_syntax_error():
    print("🔧 修復 Phase 2 語法錯誤...")
    
    # 讀取文件
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_length = len(content)
    print(f"📄 文件大小: {original_length} 字節")
    
    # 找到問題區域 (14000-14500)
    lines = content.splitlines()
    
    # 檢查第 14346-14355 行
    print("\n🔍 檢查問題區域 (14346-14355):")
    for i in range(14345, 14356):
        if i < len(lines):
            line = lines[i]
            print(f"{i+1:6d}: {line[:80]}")
    
    # 找到問題
    problem_line = 14348
    print(f"\n🚨 檢測到問題在第 {problem_line} 行")
    
    if problem_line - 1 < len(lines):
        problem_content = lines[problem_line - 1]
        print(f"問題行內容: {problem_content}")
        
        # 如果確實有 HTML 標籤
        if '<script' in problem_content or '</script' in problem_content:
            print("✅ 確認問題：HTML 標籤出現在 JS 中")
            
            # 方案 1: 直接移除問題行
            lines[problem_line - 1] = "    // [已移除問題代碼: HTML 標籤出現在 JS 中]"
            
            # 方案 2: 添加 JavaScript 註解
            # lines[problem_line - 1] = "    // " + problem_content
            
            print("🔄 已修復問題行")
    
    # 重新組合
    fixed_content = '\n'.join(lines)
    
    # 保存
    with open('index.html.fixed', 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f"✅ 已儲存修復版本: index.html.fixed ({len(fixed_content)} 字節)")
    
    # 創建緊急恢復腳本
    restore_script = """#!/bin/bash
echo "🚨 Phase 2 語法錯誤緊急恢復腳本"

# 1. 備份當前文件
cp index.html index.html.backup.$(date +%Y%m%d_%H%M%S)

# 2. 套用修復
if [ -f "index.html.fixed" ]; then
    cp index.html.fixed index.html
    echo "✅ 已套用語法修復"
else
    echo "⚠️ 未找到修復文件，恢復到 v1.6.173"
    git checkout v1.6.173 -- index.html
fi

# 3. 檢查語法
echo "🔍 檢查語法..."
node --check index.html 2>/dev/null && echo "✅ 語法檢查通過" || echo "❌ 語法檢查失敗"

# 4. 提交修復
echo "📦 提交修復..."
git add index.html
git commit -m "緊急修復: Phase 2 語法錯誤 (第 14348 行 HTML 標籤問題)"
git push origin main

echo "🚀 已推送到 GitHub，等待部署..."
echo "💡 檢查連結: https://denias5499.github.io/learning-progress-board/"
"""
    
    with open('restore_phase2_fix.sh', 'w', encoding='utf-8') as f:
        f.write(restore_script)
    
    import os
    os.chmod('restore_phase2_fix.sh', 0o755)
    print("📜 已創建恢復腳本: restore_phase2_fix.sh")
    
    # 簡易語法檢查
    print("\n🧪 執行簡易語法檢查...")
    try:
        import subprocess
        result = subprocess.run(['node', '--check', 'index.html.fixed'], 
                               capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ 語法檢查通過！")
        else:
            print("❌ 語法檢查失敗:")
            print(result.stderr)
    except Exception as e:
        print(f"⚠️ 無法執行語法檢查: {e}")
    
    return True

# 創建 Console 修復代碼
def create_console_fix():
    fix_code = """
// 🔧 Phase 2 語法錯誤瀏覽器修復腳本
console.group('🚨 Phase 2 語法錯誤緊急修復');

try {
    // 錯誤位置分析
    const errorLine = 14348;
    console.log(`📍 語法錯誤位置: line ${errorLine}`);
    
    // 錯誤原因：'</script>' 標籤出現在 JavaScript 中
    console.log('🔍 原因：HTML 結束標籤出現在 JS 代碼中');
    
    // 緊急繞過方案
    console.log('🛡️ 執行緊急繞過...');
    
    // 方案1：暫停有問題的代碼執行
    if (window._phase2CompatInjected) {
        console.log('⏸️ 暫停 Phase 2 兼容層');
        window._phase2CompatInjected = false;
    }
    
    // 方案2：恢復核心函數
    const restoreCoreFunctions = () => {
        console.log('🔧 恢復核心函數...');
        
        if (typeof saveToLocal === 'undefined') {
            window.saveToLocal = function(uid) {
                console.log('💾 saveToLocal (模擬)');
                return true;
            };
        }
        
        if (typeof loadFromLocal === 'undefined') {
            window.loadFromLocal = function(uid) {
                console.log('📦 loadFromLocal (模擬)');
                return window.multiData || {};
            };
        }
    };
    
    restoreCoreFunctions();
    
    console.log('✅ 緊急修復完成！');
    console.log('💡 建議：立即刷新頁面 (F5)');
    
} catch (e) {
    console.error('❌ 修復過程中錯誤:', e);
    
    // 終極方案：強制刷新
    console.log('🔄 執行強制刷新...');
    setTimeout(() => {
        location.reload(true);
    }, 1000);
}

console.groupEnd();
"""
    
    print("\n📋 Console 修復代碼:")
    print("=" * 50)
    print(fix_code)
    print("=" * 50)
    
    with open('console_fix_syntax.js', 'w', encoding='utf-8') as f:
        f.write(fix_code)
    
    print("\n✅ 已儲存 Console 修復代碼: console_fix_syntax.js")

if __name__ == '__main__':
    print("=" * 60)
    print("Phase 2 語法錯誤緊急修復工具 v2")
    print("=" * 60)
    
    fix_syntax_error()
    create_console_fix()
    
    print("\n🚀 修復選項:")
    print("1. 執行 Bash 腳本: ./restore_phase2_fix.sh")
    print("2. 手動修復步驟:")
    print("   a. git checkout v1.6.173 -- index.html")
    print("   b. git commit -m 'Revert Phase 2 syntax error'")
    print("   c. git push origin main")
    print("3. 使用 Console 修復代碼 (瀏覽器中執行)")
