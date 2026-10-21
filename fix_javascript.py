import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到之前插入的 JS 程式碼並修正
js_pattern = r'<!-- 新增按鈕互動功能 -->\s*<script>([\s\S]*?)</script>'

def create_fixed_js():
    return '''
<!-- 新版互動功能 v1.6.142.2 -->
<script>
(function() {
  console.log('[智慧排程模式] 初始化互動功能');
  let activeExpandedDesc = null;
  
  // 建立狀態列
  if (!document.getElementById('wz-status-line')) {
    const statusLine = document.createElement('div');
    statusLine.id = 'wz-status-line';
    statusLine.style.cssText = 'position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.9); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; max-width: 90%; text-align: center; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); display: none; transition: opacity 0.3s ease;';
    document.body.appendChild(statusLine);
    console.log('[智慧排程模式] 狀態列建立完成');
  }
  
  const statusLine = document.getElementById('wz-status-line');
  
  // 初始化按鈕互動
  function initButtonInteractions() {
    const descTexts = document.querySelectorAll('.wz-desc-text');
    console.log('[智慧排程模式] 找到描述元素:', descTexts.length);
    
    descTexts.forEach(span => {
      // 清除舊的事件監聽器
      const newSpan = span.cloneNode(true);
      span.parentNode.replaceChild(newSpan, span);
      
      // 新增新的監聽器
      newSpan.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('[智慧排程模式] 點擊:', this.dataset.full?.substring(0, 30) + '...');
        
        // 收合前一個展開的元素
        if (activeExpandedDesc && activeExpandedDesc !== this) {
          activeExpandedDesc.classList.remove('expanded');
          console.log('[智慧排程模式] 收合前一個元素');
        }
        
        // 切換當前元素
        if (this.classList.contains('expanded')) {
          this.classList.remove('expanded');
          activeExpandedDesc = null;
          statusLine.style.display = 'none';
          console.log('[智慧排程模式] 收合當前元素');
        } else {
          this.classList.add('expanded');
          activeExpandedDesc = this;
          
          // 顯示狀態列
          statusLine.textContent = this.dataset.full || this.innerText;
          statusLine.style.display = 'block';
          statusLine.style.opacity = '1';
          console.log('[智慧排程模式] 展開當前元素，狀態列更新');
          
          // 自動隱藏計時器
          setTimeout(() => {
            if (activeExpandedDesc === this) {
              statusLine.style.opacity = '0';
              setTimeout(() => {
                if (activeExpandedDesc === this) {
                  statusLine.style.display = 'none';
                  console.log('[智慧排程模式] 狀態列自動隱藏');
                }
              }, 300);
            }
          }, 4000);
        }
      });
      
      // 懸停顯示完整文字
      newSpan.addEventListener('mouseenter', function() {
        if (!activeExpandedDesc) {
          statusLine.textContent = this.dataset.full || this.innerText;
          statusLine.style.display = 'block';
          statusLine.style.opacity = '1';
        }
      });
      
      newSpan.addEventListener('mouseleave', function() {
        if (!activeExpandedDesc) {
          statusLine.style.opacity = '0';
          setTimeout(() => {
            if (!activeExpandedDesc) {
              statusLine.style.display = 'none';
            }
          }, 300);
        }
      });
    });
    
    console.log('[智慧排程模式] 互動功能初始化完成');
  }
  
  // 全域點擊收合
  document.addEventListener('click', function(e) {
    if (activeExpandedDesc && !activeExpandedDesc.contains(e.target)) {
      activeExpandedDesc.classList.remove('expanded');
      activeExpandedDesc = null;
      statusLine.style.display = 'none';
      console.log('[智慧排程模式] 點擊頁面其他區域，收合所有元素');
    }
  });
  
  // 延遲初始化以確保 DOM 準備好
  setTimeout(initButtonInteractions, 100);
})();
</script>
'''

# 替換舊的 JS 程式碼
if re.search(js_pattern, content):
    content = re.sub(js_pattern, create_fixed_js(), content, 1)
    print("✅ 已替換 JS 程式碼")
else:
    # 如果找不到，在 </body> 前插入
    body_end_pattern = r'(</body>)'
    if re.search(body_end_pattern, content):
        content = re.sub(body_end_pattern, create_fixed_js() + r'\1', content, 1)
        print("✅ 已在 </body> 前插入 JS 程式碼")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
