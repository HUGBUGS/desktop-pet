import React, { useState } from 'react';
import * as styles from './HelloWorld.module.css';
import Pet from '../Pet/Pet';

const HelloWorld = () => {
  const [count, setCount] = useState(0);
  
  // 添加调试信息
  console.log('Styles:', styles);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Hello World!
      </h1>
      <div className={styles.card}>
        <p className={styles.counter}>
          点击次数: {count}
        </p>
        <button
          onClick={() => setCount(count + 1)}
          className={styles.button}
        >
          点击我
        </button>
      </div>
      <div className={styles.petWrapper}>
        <Pet />
      </div>
    </div>
  );
};

export default HelloWorld; 