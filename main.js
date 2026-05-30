const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path'); // 🌟 新增这一行
app.disableHardwareAcceleration(); // 🌟 杀手锏：强行关闭硬件加速，秒杀 Windows 渲染卡顿！

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,  // 适配新的欧美风 UI 宽度
    height: 600,
    frame: false, // 无边框模式
    icon: path.join(__dirname, 'icon.ico'), // 🌟 新增这一行：任务栏图标
    transparent: true, // 允许透明背景和圆角
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)

// 监听变小窗口的指令（名字与 renderer.js 完美对应）
ipcMain.on('window-shrink', () => {
  // 获取屏幕尺寸，恢复你超赞的“飞到右上角”功能！
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  
  // 变成小药丸长条 (宽400, 高80，适配新的图标尺寸)
  mainWindow.setSize(400, 80); 
  
  // 飞到右上角 (屏幕宽度减去软件宽度，再留点边距)
  mainWindow.setPosition(width - 420, 30); 
  
  // 永远置顶！绝对不被覆盖！
  mainWindow.setAlwaysOnTop(true); 
})

// 监听恢复大窗口的指令
ipcMain.on('window-expand', () => {
  mainWindow.setSize(1000, 600);
  mainWindow.center(); // 居中
  mainWindow.setAlwaysOnTop(false); // 取消置顶
})

// 监听关闭软件指令
ipcMain.on('window-close', () => {
  app.quit();
})