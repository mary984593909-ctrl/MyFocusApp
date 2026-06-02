const { app, BrowserWindow, ipcMain, screen, globalShortcut, clipboard, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Screenshots = require('electron-screenshots'); // 🌟 引入微信级截图神器

app.disableHardwareAcceleration(); // 🌟 杀手锏：强行关闭硬件加速，秒杀 Windows 渲染卡顿！

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,  
    height: 600,
    frame: false, // 无边框模式
    icon: path.join(__dirname, 'icon.ico'), // 任务栏图标
    transparent: true, // 允许透明背景和圆角
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

// 🌟 初始化应用
app.whenReady().then(() => {
  
  // === 🌟 初始化微信级截图神器 ===
  global.screenshots = new Screenshots({
    lang: {
      magnifier_position_label: '坐标',
      operation_ok_title: '确定/复制',
      operation_cancel_title: '取消',
      operation_save_title: '保存',
      operation_redo_title: '撤销',
      operation_undo_title: '重做',
      operation_mosaic_title: '马赛克',
      operation_text_title: '文本',
      operation_brush_title: '画笔',
      operation_arrow_title: '箭头',
      operation_ellipse_title: '椭圆',
      operation_rectangle_title: '矩形'
    }
  });

  // 1. 监听用户点击“确定”或双击截图（直接复制到系统剪贴板）
  global.screenshots.on('ok', (e, buffer, bounds) => {
    clipboard.writeImage(nativeImage.createFromBuffer(buffer));
  });

  // 2. 监听用户点击“取消”
  global.screenshots.on('cancel', () => {
    console.log('用户取消了截图');
  });

  // 3. 监听用户点击“保存”
  global.screenshots.on('save', (e, buffer, bounds) => {
    dialog.showSaveDialog({
      title: '保存截图',
      defaultPath: '截图.png',
      filters: [{ name: 'Images', extensions: ['png'] }]
    }).then(result => {
      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, buffer);
      }
    });
  });
  // ======================================

  createWindow(); // 创建主窗口
});

// === 窗口控制逻辑 ===

ipcMain.on('window-shrink', () => {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setSize(280, 64); 
  mainWindow.setPosition(width - 420, 30); 
  mainWindow.setAlwaysOnTop(true); 
});

ipcMain.on('window-expand', () => {
  mainWindow.setSize(1000, 600);
  mainWindow.center(); 
  mainWindow.setAlwaysOnTop(false); 
});

ipcMain.on('window-close', () => {
  app.quit();
});

// === 🌟 截图快捷键与触发逻辑 ===

// 动态注册/注销全局快捷键
ipcMain.on('update-shortcut', (event, oldKey, newKey) => {
  if (oldKey) globalShortcut.unregister(oldKey);
  if (newKey) {
    globalShortcut.register(newKey, () => {
      // 快捷键触发时，直接唤起微信级截图！
      if (global.screenshots) global.screenshots.startCapture();
    });
  }
});

// 监听渲染进程（截屏按钮点击）唤起截图
ipcMain.on('take-screenshot', () => {
  if (global.screenshots) global.screenshots.startCapture();
});

// 软件退出时注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});