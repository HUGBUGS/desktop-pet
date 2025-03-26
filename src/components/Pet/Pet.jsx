import React, { useState, useEffect } from 'react';
import * as styles from './Pet.module.css';

const Pet = () => {
  const [showTip, setShowTip] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTimer, setAnimationTimer] = useState(null);

  const handleVoiceClick = () => {
    // 清除之前的定时器
    if (animationTimer) {
      clearTimeout(animationTimer);
    }

    // 开始新的动画
    setIsAnimating(true);
    setShowTip(true);

    // 设置30秒后停止动画
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setShowTip(false);
    }, 30000);

    setAnimationTimer(timer);
  };

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (animationTimer) {
        clearTimeout(animationTimer);
      }
    };
  }, [animationTimer]);

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
        <div className={styles.tipContainer}>
          <div className={styles.tipBubble}>
            <div className={styles.tipText}>你想让我做点什么？</div>
            <div className={styles.tipArrow}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pet;