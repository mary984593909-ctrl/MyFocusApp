# 🍅 工作休息钟 (Focus Timer)

> 一款基于 Electron 开发的跨平台桌面端专注力管理软件。
> 纯本地运行、无边框沉浸式设计、完美支持 25+5 番茄工作法及四象限待办管理。

## ✨ 核心功能

- **⌚ 精确计时**：底层采用真实物理时间戳（Timestamp）校准，即使电脑休眠、屏保、关闭软件，倒计时依然精准无误，绝不漏秒。
- **🔄 智能状态无缝切换**：工作与休息状态按钮动态自适应切换，界面极简绝不打架，操作完全直觉化。
- **⏳ 人性化弹性延时 (+5分钟)**：遇到灵感迸发或工作没收尾？一键“延时5分钟”动态调整当前时间轴，专注节奏由你掌控，告别死板闹钟。
- **🖥️ 沉浸式与迷你模式**：支持全屏无边框工作模式；工作时可一键收缩为“极简悬浮小窗”，永远置顶，不遮挡任何工作软件。
- **🚨 防自我 PUA 机制**：强制休息提醒，拒绝无效内卷，严格遵循 20-20-20 科学护眼法则。
- **📊 四象限待办清单**：内置 Eisenhower 矩阵（紧急重要四象限），支持滚动条无限添加，状态本地自动保存。
- **⚙️ 高度自定义**：可自由调整工作时长、短休/长休时长、长休循环间隔，满足不同专注节奏。

---

## 🛠️ 技术栈
- **核心框架**：[Electron](https://www.electronjs.org/) (Node.js + Chromium)
- **前端页面**：原生 HTML5 + CSS3 + Vanilla JavaScript
- **数据存储**：Local Storage (纯本地存储，隐私绝对安全)
- **打包工具**：Electron Builder

---

## 🚀 独立开发者踩坑与求生指南 (Developer Notes)

> **⚠️ 警告**：以下内容为国内环境开发 Electron 的血泪总结，价值千金，重装电脑后请严格按此执行。

### 阶段一：环境准备 (修路 & 买地)
1. 安装 Node.js。
2. 配置环境变量，打通国内镜像（遇到 `npm install` 卡死时必用）：
   ```powershell
   $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
   $env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"


### 阶段二：手动安装 Electron
1. 如果 npm 自动下载 Electron 引擎失败报错（如 path.txt 找不到），直接物理碾压：

2.运行 npm install electron --save-dev --ignore-scripts=false 拿到空壳文件。
去淘宝镜像站手动下载对应版本的 electron-vXX.X.X-win32-x64.zip。
3.在 node_modules/electron/ 下新建 dist 文件夹。
把压缩包里的所有东西解压进 dist（确保点进去直接能看到 electron.exe）。
4.在 node_modules/electron/ 下新建 path.txt，里面只写一行字：dist\electron.exe（千万注意别手滑存成 .txt.txt）。


### 阶段三：本地调试
1. 终端运行：npm start
注：每次修改代码需关闭软件后重新运行。


### 阶段四：打包出海 (.exe 生成)
1.准备一张 .ico 格式的图标。
在 package.json 中配置：
"name": "focustimer"（软件英文代号）
"productName": "工作休息钟"（桌面显示的中文名）
"icon": "icon.ico"（引入你的图标）
2. 终端运行打包命令：npm run build
3. 去新生成的 dist-app 文件夹里，拿到 工作休息钟 Setup 1.0.0.exe。


### 阶段五：版本迭代 (V1.0.1)
1.修改代码修复 Bug 或增加新功能。
2.打开 package.json，把 "version" 从 "1.0.0" 改为 "1.0.1"。
3.再次运行 npm run build。
4.双击新生成的 Setup 1.0.1.exe，覆盖安装，本地数据完美保留，更新成功！

