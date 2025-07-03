// 后台脚本 - 处理快捷键和消息传递

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-recording") {
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        // 向内容脚本发送切换记录状态的消息
        chrome.tabs.sendMessage(tabs[0].id, {action: "toggleRecording"});
      }
    });
  }
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSubtitles") {
    // 保存字幕到存储
    chrome.storage.local.get(['subtitles'], (result) => {
      const subtitles = result.subtitles || [];
      subtitles.push({
        text: request.text,
        timestamp: new Date().toLocaleTimeString(),
        order: Date.now() // 添加精确的时间戳用于排序
      });
      
      chrome.storage.local.set({subtitles: subtitles}, () => {
        console.log('字幕已保存:', request.text);
      });
    });
  } else if (request.action === "clearSubtitles") {
    // 清空字幕记录
    chrome.storage.local.set({subtitles: []}, () => {
      console.log('字幕记录已清空');
    });
  }
});

// 插件安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    subtitles: [],
    isRecording: false
  });
}); 