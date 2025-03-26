import React, { useState, useEffect } from 'react';
import * as styles from './Pet.module.css';
import { voiceService } from '../../services/voiceService';

const Pet = () => {
  const [showTip, setShowTip] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTimer, setAnimationTimer] = useState(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRecognizedText, setHasRecognizedText] = useState(false);

  // 重置所有状态
  const resetStates = () => {
    setIsAnimating(false);
    setIsProcessing(false);
    setShowTip(true);
    if (!hasRecognizedText) {
      setRecognizedText('识别出错，请重试');
    }
  };

  useEffect(() => {
    // 设置语音识别结果回调
    voiceService.setOnResultCallback((text) => {
      setRecognizedText(text);
      if (text && text !== '正在听...') {
        setHasRecognizedText(true);
      }
    });

    // 设置错误回调
    voiceService.setOnErrorCallback((error) => {
      console.error('语音识别错误：', error);
      resetStates();
    });

    // 设置录音状态变化回调
    voiceService.setOnRecordingStateChangeCallback((isRecording) => {
      setIsAnimating(isRecording);
      if (!isRecording) {
        setIsProcessing(true);
        if (recognizedText && recognizedText !== '正在听...') {
          setRecognizedText('正在执行主人的指令...');
        }
      }
    });

    // 组件卸载时停止录音
    return () => {
      if (isAnimating) {
        voiceService.stopRecording();
      }
      if (animationTimer) {
        clearTimeout(animationTimer);
      }
    };
  }, [isAnimating, animationTimer, hasRecognizedText, recognizedText]);

  const handleVoiceClick = async () => {
    if (isAnimating) {
      // 如果正在录音，则停止
      voiceService.stopRecording();
    } else {
      // 开始录音
      try {
        await voiceService.init(); // 确保 WebSocket 连接已建立
        if (voiceService.startRecording()) {
          setShowTip(true);
          setRecognizedText('正在听...');
          setHasRecognizedText(false); // 重置识别状态
        }
      } catch (error) {
        console.error('初始化语音识别失败：', error);
        resetStates();
      }
    }
  };

  // 添加点击事件处理函数来关闭气泡框
  const handleTipClick = () => {
    if (!isAnimating) { // 只在非录音状态下允许关闭气泡框
      setShowTip(false);
    }
  };

  return (
    <div className={styles.petContainer}>
      <div className={styles.pet}>
        <div className={styles.petBody}>
          <div className={`${styles.petCheek} ${styles.left}`} />
          <div className={`${styles.petCheek} ${styles.right}`} />
          <div className={`${styles.petEye} ${styles.left}`} />
          <div className={`${styles.petEye} ${styles.right}`} />
          <div className={styles.petMouth} />
          <div className={`${styles.petEar} ${styles.left}`} />
          <div className={`${styles.petEar} ${styles.right}`} />
        </div>
      </div>
      <div 
        className={`${styles.voiceIcon} ${isAnimating ? styles.animating : ''}`}
        onClick={handleVoiceClick}
      >
        <div className={styles.voiceIconInner}>
          <div className={styles.voiceWave}></div>
          <div className={styles.voiceWave}></div>
          <div className={styles.voiceWave}></div>
        </div>
      </div>
      {showTip && (
        <div className={styles.tipContainer} onClick={handleTipClick}>
          <div className={styles.tipBubble}>
            <div className={styles.tipText}>
              {recognizedText || '你想让我做点什么？'}
            </div>
            <div className={styles.tipArrow}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pet;