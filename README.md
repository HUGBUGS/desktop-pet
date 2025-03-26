# Desktop Pet

一个基于 Electron 和 React 的桌面宠物应用。

## 项目简介

这是一个使用 Electron 和 React 构建的桌面宠物应用。它可以在您的桌面上显示一个可爱的宠物，为您的工作环境增添一些趣味。

## 技术栈

- Electron
- React
- Webpack
- Babel

## 开发环境要求

- Node.js (推荐 v14 或更高版本)
- Yarn 包管理器

## 安装

1. 克隆项目：
```bash
git clone git@github.com:HUGBUGS/desktop-pet.git
cd desktop-pet
```

2. 安装依赖：
```bash
yarn install
```

## 开发

1. 构建 React 应用：
```bash
yarn build
```

2. 启动 Electron 应用：
```bash
yarn start
```

## 项目结构

```
desktop-pet/
├── src/                # React 源代码目录
│   └── index.js       # React 应用入口文件
├── dist/              # 构建输出目录
├── main.js           # Electron 主进程文件
├── index.html        # 应用 HTML 文件
├── webpack.config.js # Webpack 配置文件
└── package.json      # 项目配置文件
```

## 构建

要构建生产版本的应用：

```bash
yarn build
```

## 许可证

MIT License 