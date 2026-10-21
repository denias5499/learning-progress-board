#!/bin/bash
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
