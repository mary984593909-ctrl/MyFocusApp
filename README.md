# 🍅 工作休息钟 (Focus Timer)

> 一款基于 Electron 开发的跨平台桌面端专注力管理软件。
> 主打纯本地运行与无边框沉浸式设计，完美融合 **25+5 番茄工作法**与**四象限待办管理**，助你找回掌控时间的节奏感。

## ✨ 核心功能 (全新升级版)

- **⌚ 物理级精准计时与防假死**：底层采用真实物理时间戳（Timestamp）校准，结合前端 GPU 硬件加速锁。哪怕电脑休眠、进入屏保，倒计时与界面依然精准无误，彻底告别后台休眠假死 Bug。
- **📊 四象限待办清单**：内置 Eisenhower 矩阵（紧急/重要四象限），支持无限滚动添加任务。下拉框轻松**关联当前专注任务**，所有状态纯本地自动保存。
- **📝 一键生成工作日报**：下班前不知怎么汇报？一键自动抓取四象限内“已完成/推进中”的任务，按重要紧急程度智能生成排版精美的文字日报，一键复制即可发送给老板。
- **💊 “灵动岛”级悬浮小窗**：工作需要查资料时，可一键收缩为绝美极简的“胶囊小窗”，不仅无缝融入桌面，且支持全区域拖拽，绝不遮挡工作视线。
- **☕ 智能午休防卷机制**：支持设定专属午休时间与自定义提示音。时间一到，系统自动拦截并暂停工作倒计时，弹出温馨提示框，强制打断内卷，提醒你好好休息。
- **🔔 强行防沉迷打断**：当处于小窗专注模式且工作倒计时归零时，主界面会**自动弹回屏幕正中央**，从视觉上强行打断你的工作流，逼迫你立刻起身休息。
- **🎵 专属自定义提示音**：除了默认清脆的提示音外，支持一键上传本地 MP3/WAV 音乐作为专属上下班/午休打铃声。
- **⚙️ 节奏高度自定义**：自由调整工作、短休、长休时长及长休间隔；遇到灵感迸发？一键“延时 5 分钟”动态调整时间轴，专注节奏由你掌控。

---

## 🛠️ 技术栈

- **核心框架**：[Electron](https://www.electronjs.org/) (Node.js + Chromium)
- **前端页面**：原生 HTML5 + CSS3 + Vanilla JavaScript (纯原生，轻量级)
- **数据存储**：Local Storage (纯本地存储，隐私绝对安全，无需联网)
- **打包工具**：Electron Builder

---

## 🚀 独立开发者踩坑与求生指南 (Developer Notes)

> **⚠️ 警告**：以下内容为国内网络环境下开发 Electron 的总结。如果重装电脑或迁移项目，请严格按此指南操作。

### 阶段一：环境准备 (修路 & 买地)
1. 安装 Node.js。
2. 配置环境变量，打通国内镜像（遇到 `npm install` 卡死时，这招能救命）：
   ```powershell
   $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
   $env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
   ```

### 阶段二：手动安装 Electron (暴力破解法)
如果 npm 自动下载 Electron 引擎失败并报错（比如提示找不到 `path.txt`），请放弃网络挣扎，直接物理覆盖：

1. 运行 `npm install electron --save-dev --ignore-scripts=false`，先拿到一个**空壳**文件夹。
2. 前往 [淘宝 NPM 镜像站](https://npmmirror.com/) 手动下载对应版本的压缩包（如 `electron-vXX.X.X-win32-x64.zip`）。
3. 在项目目录 `node_modules/electron/` 下新建一个 `dist` 文件夹。
4. 将压缩包里的所有文件**解压到 `dist` 文件夹中**（确保点进 `dist` 就能直接看到 `electron.exe`）。
5. 在 `node_modules/electron/` 目录下新建一个文件命名为 `path.txt`，里面只写一行字：
   ```text
   dist\electron.exe
   ```
   *(💡 避坑提示：确保文件名是 `path.txt`，千万别手滑存成了 `path.txt.txt`)*

### 阶段三：解决 Windows 窗口拖拽卡顿/假死黑屏
如果在 Windows 系统下发现窗口拖动有拖影，或者休眠唤醒后界面一片纯白/纯黑，这是 Chromium 内核与某些显卡的硬件加速冲突。
**救命代码**（务必加在 `main.js` 的最顶部）：
```javascript
const { app } = require('electron');
app.disableHardwareAcceleration(); // 强行关闭硬件加速，秒杀 UI 卡顿！
```

### 阶段四：本地调试
1. 在终端运行启动命令：
   ```bash
   npm start
   ```
   *(💡 注：由于是原生开发，每次修改 main.js 或前端代码后，需关闭当前软件窗口并重新运行该命令才能看到效果。)*

### 阶段五：打包出海 (生成 .exe 安装包)
1. 准备一张 `.ico` 格式的软件图标。
2. 在 `package.json` 中配置好以下基础信息：
   ```json
   {
     "name": "focustimer", 
     "productName": "我的专注清单", 
     "icon": "icon.ico"
   }
   ```
   *(注：`name` 为英文代号，`productName` 为安装后桌面显示的中文名)*
3. 终端运行打包命令：
   ```bash
   npm run build
   ```
4. 打包完成后，去新生成的 `dist-app` 文件夹里，即可提取 `我的专注清单 Setup 1.0.0.exe` 发版。

### 阶段六：版本迭代 (如升级到 V1.0.1)
1. 修改代码，修复 Bug 或增加新功能。
2. 打开 `package.json`，把 `"version"` 字段从 `"1.0.0"` 改为 `"1.0.1"`。
3. 再次运行 `npm run build` 打包。
4. 双击新生成的 `Setup 1.0.1.exe`，**直接覆盖安装**。本地 LocalStorage 数据会自动保留，无缝升级成功！