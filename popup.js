// 弹出窗口脚本

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggle-btn');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');
  const exportBtn = document.getElementById('export-btn');
  const statusText = document.getElementById('status-text');
  const statusIndicator = document.getElementById('status-indicator');
  const subtitleText = document.getElementById('subtitle-text');
  const countElement = document.getElementById('count');
  
  let isRecording = false;

  // 初始化界面
  function init() {
    updateUI();
    loadSubtitles();
    
    // 监听存储变化
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isRecording) {
        isRecording = changes.isRecording.newValue;
        updateUI();
      }
      if (changes.subtitles) {
        loadSubtitles();
      }
    });
  }

  // 更新界面状态
  function updateUI() {
    chrome.storage.local.get(['isRecording'], (result) => {
      isRecording = result.isRecording || false;
      
      if (isRecording) {
        toggleBtn.textContent = '停止记录';
        toggleBtn.classList.add('recording');
        statusText.textContent = '正在记录中...';
        statusIndicator.classList.add('recording');
      } else {
        toggleBtn.textContent = '开始记录';
        toggleBtn.classList.remove('recording');
        statusText.textContent = '未开始记录';
        statusIndicator.classList.remove('recording');
      }
    });
  }

  // 加载字幕列表
  function loadSubtitles() {
    chrome.storage.local.get(['subtitles'], (result) => {
      const subtitles = result.subtitles || [];
      displaySubtitles(subtitles);
      countElement.textContent = subtitles.length;
    });
  }

    // 显示字幕文本
  function displaySubtitles(subtitles) {
    if (subtitles.length === 0) {
      subtitleText.value = '';
      return;
    }

    // 按时间戳排序确保正确顺序，然后连接成连续文本
    const sortedSubtitles = [...subtitles].sort((a, b) => {
      // 优先使用精确的时间戳排序
      if (a.order && b.order) {
        return a.order - b.order;
      }
      // 备用方案：按时间字符串排序
      if (a.timestamp && b.timestamp) {
        return new Date('1970/01/01 ' + a.timestamp) - new Date('1970/01/01 ' + b.timestamp);
      }
      return 0;
    });
    
    const text = sortedSubtitles.map(subtitle => subtitle.text).join('');
    subtitleText.value = text;
    
    // 滚动到底部显示最新内容
    subtitleText.scrollTop = subtitleText.scrollHeight;
  }

  // 切换记录状态
  toggleBtn.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleRecording'});
      }
    });
  });

  // 清空记录
  clearBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有字幕记录吗？')) {
      chrome.runtime.sendMessage({action: 'clearSubtitles'});
      showMessage('字幕记录已清空');
    }
  });

  // 复制字幕到剪贴板
  copyBtn.addEventListener('click', () => {
    chrome.storage.local.get(['subtitles'], (result) => {
      const subtitles = result.subtitles || [];
      
      if (subtitles.length === 0) {
        showMessage('暂无字幕内容可复制');
        return;
      }

      // 按时间戳排序确保正确顺序，然后合并成连续文本
      const sortedSubtitles = [...subtitles].sort((a, b) => {
        if (a.order && b.order) {
          return a.order - b.order;
        }
        if (a.timestamp && b.timestamp) {
          return new Date('1970/01/01 ' + a.timestamp) - new Date('1970/01/01 ' + b.timestamp);
        }
        return 0;
      });
      const text = sortedSubtitles.map(subtitle => subtitle.text).join('');
      
      // 复制到剪贴板
      navigator.clipboard.writeText(text).then(() => {
        showMessage(`字幕已复制到剪贴板 (${subtitles.length}条)`);
      }).catch(err => {
        console.error('复制失败:', err);
        showMessage('复制失败，请手动选择文本复制');
      });
    });
  });

  // 导出字幕
  exportBtn.addEventListener('click', () => {
    chrome.storage.local.get(['subtitles'], (result) => {
      const subtitles = result.subtitles || [];
      
      if (subtitles.length === 0) {
        showMessage('暂无字幕可导出');
        return;
      }

      // 按时间戳排序确保正确顺序，然后生成连续文本内容
      const sortedSubtitles = [...subtitles].sort((a, b) => {
        if (a.order && b.order) {
          return a.order - b.order;
        }
        if (a.timestamp && b.timestamp) {
          return new Date('1970/01/01 ' + a.timestamp) - new Date('1970/01/01 ' + b.timestamp);
        }
        return 0;
      });
      const content = sortedSubtitles.map(subtitle => subtitle.text).join('');

      // 创建下载链接
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `字幕记录_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showMessage('字幕已导出为文本文件');
    });
  });

  // 显示消息提示
  function showMessage(message) {
    // 创建临时消息元素
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 8px 15px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 2000);
  }

  // 初始化
  init();
}); 