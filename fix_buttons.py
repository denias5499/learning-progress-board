with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 修正時數模式描述
import re
pattern1 = r'(<span style="font-weight: bold; font-size: 0\.95em; color: #0369a1; flex-shrink: 0;">時數模式 \(A\)</span>\s*<span style="font-size: 0\.82em; color: #475569; flex: 1; overflow: hidden; text-overflow: ellipsis;">)(.*?)(</span>)'
replacement1 = r'\1\2\3'
new_text1 = '<span style="font-weight: bold; font-size: 0.95em; color: #0369a1; flex-shrink: 0;">時數模式 (A)</span>\n                            <span class="wz-desc-text" data-full="\2" style="font-size: 0.82em; color: #475569; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: help;" title="點擊展開/收合">\2</span>'
content = re.sub(pattern1, new_text1, content)

# 修正單元模式描述
pattern2 = r'(<span style="font-weight: bold; font-size: 0\.95em; color: #475569; flex-shrink: 0;">單元模式 \(B\)</span>\s*<span style="font-size: 0\.82em; color: #475569; flex: 1; overflow: hidden; text-overflow: ellipsis;">)(.*?)(</span>)'
new_text2 = '<span style="font-weight: bold; font-size: 0.95em; color: #475569; flex-shrink: 0;">單元模式 (B)</span>\n                            <span class="wz-desc-text" data-full="\2" style="font-size: 0.82em; color: #475569; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: help;" title="點擊展開/收合">\2</span>'
content = re.sub(pattern2, new_text2, content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ 已修正描述文字樣式")
