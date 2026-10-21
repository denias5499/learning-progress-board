import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 在 <head> 標籤結束前新增樣式
style_block = '''
    <style id="wz-hotfix">
        /* v1.6.142.1 強制修正：智慧排程模式按鈕文字顯示 */
        .wizard-row .wz-desc-text {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            max-width: 300px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            font-size: 0.82em !important;
            color: #475569 !important;
            cursor: help !important;
            padding-right: 4px !important;
            transition: all 0.2s ease !important;
        }
        
        /* 展開狀態 */
        .wizard-row .wz-desc-text.expanded {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            background: white !important;
            border-radius: 4px !important;
            padding: 4px 8px !important;
            box-shadow: 0 0 8px rgba(0,0,0,0.1) !important;
            z-index: 10 !important;
            position: relative !important;
        }
        
        /* 狀態列樣式 */
        #wz-status-line {
            position: fixed !important;
            bottom: 15px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(0,0,0,0.9) !important;
            color: white !important;
            padding: 8px 16px !important;
            border-radius: 20px !important;
            font-size: 14px !important;
            max-width: 90% !important;
            text-align: center !important;
            z-index: 99999 !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
        }
        
        /* 按鈕容器調整 */
        label[id*="wz-mode-"] {
            min-height: 50px !important;
        }
    </style>
'''

# 尋找 </head> 標籤並插入樣式
head_end_pattern = r'(</head>)'
if re.search(head_end_pattern, content):
    content = re.sub(head_end_pattern, style_block + r'\1', content, 1)
    print("✅ 已插入 CSS 樣式")
else:
    print("❌ 找不到 </head> 標籤")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
