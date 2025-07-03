// 内容脚本 - 监控字幕元素变化

let isRecording = false;
let lastSubtitleText = '';
let observer = null;
let subtitleElement = null;

// 查找字幕元素
function findSubtitleElement() {
  return document.querySelector('p.vp-video__subtitle-text-first');
}

// 开始监控字幕变化
function startRecording() {
  subtitleElement = findSubtitleElement();
  
  if (!subtitleElement) {
    console.log('未找到字幕元素，请确保在百度网盘视频页面');
    showNotification('未找到字幕元素，请确保在百度网盘视频页面', 'error');
    return;
  }

  isRecording = true;
  chrome.storage.local.set({isRecording: true});
  
  // 创建MutationObserver来监控字幕变化
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const currentText = subtitleElement.textContent.trim();
        
        // 只有当字幕文本真正改变且不为空时才记录
        if (currentText && currentText !== lastSubtitleText) {
          lastSubtitleText = currentText;
          
          // 发送字幕到后台脚本保存
          chrome.runtime.sendMessage({
            action: 'updateSubtitles',
            text: currentText
          });
          
          console.log('记录字幕:', currentText);
        }
      }
    });
  });

  // 开始观察字幕元素
  observer.observe(subtitleElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // 记录初始字幕文本
  const initialText = subtitleElement.textContent.trim();
  if (initialText) {
    lastSubtitleText = initialText;
    chrome.runtime.sendMessage({
      action: 'updateSubtitles',
      text: initialText
    });
  }
  
  showNotification('开始记录字幕...', 'success');
  console.log('开始记录字幕');
}

// 停止记录字幕
function stopRecording() {
  isRecording = false;
  chrome.storage.local.set({isRecording: false});
  
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  lastSubtitleText = '';
  
  // 自动复制字幕到剪贴板
  copySubtitlesToClipboard();
  
  showNotification('停止记录字幕', 'info');
  console.log('停止记录字幕');
}

// 复制字幕到剪贴板
function copySubtitlesToClipboard() {
  chrome.storage.local.get(['subtitles'], (result) => {
    const subtitles = result.subtitles || [];
    
    if (subtitles.length === 0) {
      showNotification('暂无字幕内容可复制', 'warning');
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
      showNotification(`字幕已复制到剪贴板 (${subtitles.length}条)`, 'success');
      console.log('字幕已复制到剪贴板:', text);
    }).catch(err => {
      console.error('复制失败:', err);
      showNotification('复制失败，请手动复制', 'error');
    });
  });
}

// 显示通知
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
    color: white;
    border-radius: 4px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    max-width: 300px;
    word-wrap: break-word;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 根据消息类型决定显示时间
  const displayTime = type === 'success' ? 4000 : 3000;
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, displayTime);
}

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleRecording') {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 恢复记录状态
  chrome.storage.local.get(['isRecording'], (result) => {
    if (result.isRecording) {
      startRecording();
    }
  });
});

// 如果页面已经加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['isRecording'], (result) => {
      if (result.isRecording) {
        startRecording();
      }
    });
  });
} else {
  chrome.storage.local.get(['isRecording'], (result) => {
    if (result.isRecording) {
      startRecording();
    }
  });
} 