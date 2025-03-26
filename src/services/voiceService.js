import { XUNFEI_CONFIG } from '../config/xunfei';
import CryptoJS from 'crypto-js';

class VoiceService {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.websocket = null;
    this.audioQueue = []; // 用于存储等待发送的音频数据
    this.heartbeatInterval = null; // 心跳定时器
    this.reconnectAttempts = 0; // 重连尝试次数
    this.maxReconnectAttempts = 3; // 最大重连次数
    this.lastSendTime = 0; // 上次发送时间
    this.minSendInterval = 40; // 最小发送间隔（毫秒）
    this.resultText = ""; // 最终结果
    this.resultTextTemp = ""; // 临时结果
    this.onRecordingStateChangeCallback = null; // 录音状态变化回调
  }

  // 生成鉴权参数
  getAuthUrl() {
    const date = new Date().toGMTString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';
    const signatureOrigin = `host: iat-api.xfyun.cn\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, XUNFEI_CONFIG.apiSecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${XUNFEI_CONFIG.apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);
    
    return `wss://iat-api.xfyun.cn/v2/iat?authorization=${authorization}&date=${encodeURI(date)}&host=iat-api.xfyun.cn`;
  }

  // 将音频数据转换为 base64
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // 构建业务参数
  getBusinessParams() {
    return {
      language: "zh_cn",
      domain: "iat",
      accent: "mandarin",
      vad_eos: 5000,
      dwa: "wpgs"
    };
  }

  // 构建数据参数
  async getDataParams(audioData) {
    return {
      status: 1, // 1表示数据
      format: "audio/L16;rate=16000",
      encoding: "raw",
      audio: audioData
    };
  }

  // 发送音频数据
  async sendAudioData(audioData) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.audioQueue.push(audioData);
      return;
    }

    // 控制发送频率
    const now = Date.now();
    if (now - this.lastSendTime < this.minSendInterval) {
      return;
    }
    this.lastSendTime = now;

    try {
      const base64Audio = await this.blobToBase64(audioData);
      const dataParams = await this.getDataParams(base64Audio);
      
      const message = {
        common: {
          app_id: XUNFEI_CONFIG.appId
        },
        business: this.getBusinessParams(),
        data: dataParams
      };

      // 添加错误处理
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(message));
      } else {
        console.warn('WebSocket 未连接，将数据加入队列');
        this.audioQueue.push(audioData);
      }
    } catch (error) {
      console.error('发送音频数据失败：', error);
      this.audioQueue.push(audioData);
    }
  }

  // 发送开始帧
  sendStartFrame() {
    const startFrame = {
      common: {
        app_id: XUNFEI_CONFIG.appId
      },
      business: this.getBusinessParams(),
      data: {
        status: 0, // 0表示开始
        format: "audio/L16;rate=16000",
        encoding: "raw"
      }
    };
    console.log('发送开始帧：', JSON.stringify(startFrame));
    this.websocket.send(JSON.stringify(startFrame));
  }

  // 发送结束帧
  sendEndFrame() {
    const endFrame = {
      common: {
        app_id: XUNFEI_CONFIG.appId
      },
      business: this.getBusinessParams(),
      data: {
        status: 2, // 2表示结束
        format: "audio/L16;rate=16000",
        encoding: "raw"
      }
    };
    console.log('发送结束帧：', JSON.stringify(endFrame));
    this.websocket.send(JSON.stringify(endFrame));
  }

  // 发送心跳
  sendHeartbeat() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const heartbeat = {
        common: {
          app_id: XUNFEI_CONFIG.appId
        },
        business: this.getBusinessParams(),
        data: {
          status: 1, // 1表示心跳
          format: "audio/L16;rate=16000",
          encoding: "raw"
        }
      };
      console.log('发送心跳');
      this.websocket.send(JSON.stringify(heartbeat));
    }
  }

  // 开始心跳
  startHeartbeat() {
    // 每30秒发送一次心跳
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 处理识别结果
  handleResult(result) {
    if (result.data && result.data.result) {
      const data = result.data.result;
      let str = "";
      const ws = data.ws;
      for (let i = 0; i < ws.length; i++) {
        str = str + ws[i].cw[0].w;
      }

      console.log('str', str);
      
      // 处理动态修正结果
      if (data.pgs) {
        if (data.pgs === "apd") {
          // 追加结果
          this.resultText = this.resultTextTemp;
        }
        // 存储临时结果
        this.resultTextTemp = this.resultText + str;
      } else {
        this.resultText = this.resultText + str;
      }

      // 回调结果
      if (this.onResultCallback) {
        this.onResultCallback(this.resultTextTemp || this.resultText || "");
      }
    }

    // 处理结束状态
    if (result.code === 0 && result.data.status === 2) {
      this.stopRecording();
    }
    if (result.code !== 0) {
      console.error('识别错误：', result);
      this.stopRecording();
    }
  }

  // 初始化语音识别
  init() {
    return new Promise((resolve, reject) => {
      try {
        // 创建 WebSocket 连接
        this.websocket = new WebSocket(this.getAuthUrl());
        
        // 设置 WebSocket 事件处理
        this.websocket.onopen = async () => {
          console.log('WebSocket 连接已建立');
          // 发送开始帧
          this.sendStartFrame();
          // 开始心跳
          this.startHeartbeat();
          // 连接建立后，发送队列中的音频数据
          while (this.audioQueue.length > 0) {
            const audioData = this.audioQueue.shift();
            await this.sendAudioData(audioData);
          }
          // 重置重连次数
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.websocket.onmessage = (e) => {
          const result = JSON.parse(e.data);
          console.log('识别结果：', result);
          this.handleResult(result);
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket 错误：', error);
          if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
          reject(error);
        };

        this.websocket.onclose = (e) => {
          console.log('WebSocket 连接已关闭：', e);
          // 停止心跳
          this.stopHeartbeat();
          // 停止录音状态
          this.updateRecordingState(false);
          // 清空音频队列
          this.audioQueue = [];
          // 重置重连次数
          this.reconnectAttempts = 0;
          
          // 状态码为 1000 或 1005 表示正常关闭，不需要触发错误回调
          if (e.code !== 1000 && e.code !== 1005 && this.onErrorCallback) {
            this.onErrorCallback(new Error('WebSocket 连接已关闭'));
          }
        };
      } catch (error) {
        console.error('初始化语音识别失败：', error);
        reject(error);
      }
    });
  }

  // 设置录音状态变化回调
  setOnRecordingStateChangeCallback(callback) {
    this.onRecordingStateChangeCallback = callback;
  }

  // 更新录音状态
  updateRecordingState(isRecording) {
    this.isRecording = isRecording;
    if (this.onRecordingStateChangeCallback) {
      this.onRecordingStateChangeCallback(isRecording);
    }
  }

  // 开始录音
  async startRecording() {
    try {
      // 先初始化 WebSocket 连接
      await this.init();

      // 重置结果文本
      this.resultText = "";
      this.resultTextTemp = "";

      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // 关闭自动增益
          latency: 0, // 最小延迟
          googEchoCancellation: true, // 使用 Google 的回声消除
          googAutoGainControl: false, // 关闭 Google 的自动增益
          googNoiseSuppression: true, // 使用 Google 的噪声抑制
          googHighpassFilter: true, // 使用高通滤波器
          googTypingNoiseDetection: false, // 关闭打字噪声检测
          googAudioMirroring: false // 关闭音频镜像
        } 
      });
      
      // 创建音频上下文
      this.audioContext = new AudioContext({
        sampleRate: 16000,
        latencyHint: 'interactive' // 使用交互式延迟模式
      });
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // 创建 ScriptProcessorNode 用于处理音频数据，减小缓冲区大小以提高响应速度
      const scriptNode = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      // 连接音频节点
      source.connect(scriptNode);
      scriptNode.connect(this.audioContext.destination);
      
      // 处理音频数据
      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // 转换为 16 位整数
        const pcmInt16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmInt16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        // 创建新的 Blob
        const audioBlob = new Blob([pcmInt16.buffer], { type: 'audio/L16;rate=16000' });
        this.sendAudioData(audioBlob);
      };
      
      this.updateRecordingState(true);
      this.lastSendTime = 0; // 重置发送时间
      return true;
    } catch (error) {
      console.error('开始录音失败：', error);
      return false;
    }
  }

  // 停止录音
  stopRecording() {
    try {
      if (this.isRecording) {
        // 发送结束帧
        this.sendEndFrame();
        
        // 停止音频上下文
        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
        }
        
        // 停止心跳
        this.stopHeartbeat();
        
        // 关闭 WebSocket 连接，使用 1000 状态码表示正常关闭
        if (this.websocket) {
          this.websocket.close(1000, 'user_stop');
          this.websocket = null;
        }
        
        this.updateRecordingState(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('停止录音失败：', error);
      return false;
    }
  }

  // 设置结果回调
  setOnResultCallback(callback) {
    this.onResultCallback = callback;
  }

  // 设置错误回调
  setOnErrorCallback(callback) {
    this.onErrorCallback = callback;
  }
}

export const voiceService = new VoiceService(); 