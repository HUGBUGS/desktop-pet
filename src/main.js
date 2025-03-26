// 初始化录音按钮
const recordButton = document.getElementById('recordButton');
let isRecording = false;
let currentMessageId = null; // 用于跟踪当前正在更新的消息

recordButton.addEventListener('click', async () => {
  if (!isRecording) {
    // 开始录音
    isRecording = await voiceService.startRecording();
    if (isRecording) {
      recordButton.textContent = '停止录音';
      recordButton.classList.add('recording');
      // 创建一个新的消息气泡
      currentMessageId = addMessage('user', '正在听...');
    }
  } else {
    // 停止录音
    isRecording = !voiceService.stopRecording();
    if (!isRecording) {
      recordButton.textContent = '开始录音';
      recordButton.classList.remove('recording');
      // 生成最终回复
      if (currentMessageId) {
        const message = getMessage(currentMessageId);
        if (message && message.text !== '正在听...') {
          generateResponse(message.text);
        }
      }
    }
  }
});

// 设置语音识别结果回调
voiceService.setOnResultCallback((text) => {
  if (text && currentMessageId) {
    // 更新当前消息气泡的内容
    updateMessage(currentMessageId, text);
  }
});

// 设置错误回调
voiceService.setOnErrorCallback((error) => {
  console.error('语音识别错误：', error);
  isRecording = false;
  recordButton.textContent = '开始录音';
  recordButton.classList.remove('recording');
  if (currentMessageId) {
    updateMessage(currentMessageId, '识别出错，请重试');
  }
});

// 更新消息内容
function updateMessage(messageId, text) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageElement) {
    const textElement = messageElement.querySelector('.messageText');
    if (textElement) {
      textElement.textContent = text;
    }
  }
}