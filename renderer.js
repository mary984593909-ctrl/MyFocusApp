const { ipcRenderer } = require('electron');

// 🌟 升级：读取本地用户自定义设置
const defaultSettings = { workTime: 25, shortRest: 5, longRest: 15, interval: 4 };
let userSettings = JSON.parse(localStorage.getItem('focusSettings')) || defaultSettings;

let WORK_TIME = userSettings.workTime * 60; 
let REST_TIME = userSettings.shortRest * 60;
let LONG_REST_TIME = userSettings.longRest * 60;
let POMODORO_INTERVAL = userSettings.interval;

let timeLeft = WORK_TIME;
let timerId = null;
let isWorking = true;
let completedPomodoros = 0; // 记录完成的番茄数，触发长时休息
// 🌟 终极防休眠机制：记录绝对系统时间
let targetTime = 0; // 记录当前阶段应该结束的真实系统时间
let sessionStartTime = 0; // 记录当前阶段开始的真实系统时间
let sessionStartTotalSeconds = 0; // 记录当前阶段开始前的总专注时长

// 🌟 升级：精确到秒的专注统计
let totalSeconds = parseInt(localStorage.getItem('totalFocusSeconds')) || (parseInt(localStorage.getItem('totalFocusTime')) * 60) || 0;
// 任务数据结构
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

const timeDisplay = document.getElementById('time');
const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const addTimeBtn = document.getElementById('addTimeBtn');
const statusText = document.getElementById('statusText');
const totalFocusTimeDisplay = document.getElementById('totalFocusTime');
const taskInput = document.getElementById('taskInput');
const quadrantSelect = document.getElementById('quadrantSelect');
const alarmSound = document.getElementById('alarmSound');
const audioUpload = document.getElementById('audioUpload');
const resetDataBtn = document.getElementById('resetDataBtn');
// 🔪 彻底移除了 stopBtn 的相关定义

// 🌟 修复：每日自动清空数据
function checkDailyReset() {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('lastDate');
    
    if (!lastDate) {
        localStorage.setItem('lastDate', today);
    } else if (lastDate !== today) {
        const savedAudio = localStorage.getItem('customAudio');
        localStorage.clear();
        if (savedAudio) localStorage.setItem('customAudio', savedAudio);
        localStorage.setItem('lastDate', today);
        totalSeconds = 0;
        tasks = [];
    }
}
checkDailyReset();

// SVG 矢量图标
const iconPlay = `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const iconPause = `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const iconRest = `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
const iconWork = `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`;
const trashSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

updateTimeDisplay();
updateTotalTimeDisplay();
renderTasks();

function updateTotalTimeDisplay() {
    let hours = Math.floor(totalSeconds / 3600);
    let mins = Math.floor((totalSeconds % 3600) / 60);
    let secs = totalSeconds % 60; 
    
    if (hours > 0) {
        totalFocusTimeDisplay.innerText = `${hours} 小时 ${mins} 分钟 ${secs} 秒`;
    } else {
        totalFocusTimeDisplay.innerText = `${mins} 分钟 ${secs} 秒`;
    }
    
    localStorage.setItem('totalFocusSeconds', totalSeconds);
}

const savedAudio = localStorage.getItem('customAudio');
if (savedAudio) alarmSound.src = savedAudio;

audioUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            alarmSound.src = e.target.result;
            localStorage.setItem('customAudio', e.target.result); 
            alert("提示音设置成功并已保存！");
        };
        reader.readAsDataURL(file);
    }
});

function updateTimeDisplay() {
    timeDisplay.textContent = `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`;
}

// 🌟 数据在关机或点X时保存的终极保障
window.addEventListener('beforeunload', () => {
    localStorage.setItem('totalFocusSeconds', totalSeconds);
});

function startTimer() {
    if (timerId !== null) return;
    alarmSound.pause(); 
    startBtn.innerHTML = `${iconPause}<span class="text">暂停</span>`;
    
    // 🌟 核心：记录绝对时间！不管电脑怎么休眠，时间绝对错不了！
    targetTime = Date.now() + (timeLeft * 1000);
    sessionStartTime = Date.now();
    sessionStartTotalSeconds = totalSeconds;

    timerId = setInterval(() => {
        const now = Date.now();
        
        // 用目标时间减去现在的时间，就算电脑休眠醒来，也能瞬间跳到正确数字！
        timeLeft = Math.max(0, Math.round((targetTime - now) / 1000));
        
        if (isWorking) {
            // 同样用绝对时间计算总专注时长，一秒都不会丢
            totalSeconds = sessionStartTotalSeconds + Math.round((now - sessionStartTime) / 1000);
            updateTotalTimeDisplay(); 
        }

        updateTimeDisplay();

        if (timeLeft === 0) {
            if(alarmSound.src) {
                alarmSound.currentTime = 0;
                alarmSound.play().catch(()=>console.log("音频拦截"));
            }
            handleSessionEnd();
        }
    }, 200); // 间隔设为 200 毫秒，让 UI 刷新更顺滑，不跳秒
}

function pauseTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    startBtn.innerHTML = `${iconPlay}<span class="text">继续</span>`;
    localStorage.setItem('totalFocusSeconds', totalSeconds); 
}

function handleSessionEnd() {
    localStorage.setItem('totalFocusSeconds', totalSeconds); 
    
    if (isWorking) {
        isWorking = false;
        completedPomodoros++; // 累加完成的番茄数
        
        if (completedPomodoros % POMODORO_INTERVAL === 0) {
            timeLeft = LONG_REST_TIME;
            statusText.textContent = "LONG REST"; 
        } else {
            timeLeft = REST_TIME; 
            statusText.textContent = "REST TIME";
        }
        statusText.style.color = "#2ecc71";
        skipBtn.innerHTML = `${iconWork}<span class="text">工作</span>`;
    } else {
        isWorking = true;
        timeLeft = WORK_TIME;
        statusText.textContent = "WORK TIME";
        statusText.style.color = "var(--accent-color)";
        skipBtn.innerHTML = `${iconRest}<span class="text">休息</span>`;
    }
    updateTimeDisplay();
    
    if (timerId !== null) {
        // 🌟 核心：因为是自动无缝循环，必须刷新目标绝对时间！
        targetTime = Date.now() + (timeLeft * 1000);
        sessionStartTime = Date.now();
        sessionStartTotalSeconds = totalSeconds;
        startBtn.innerHTML = `${iconPause}<span class="text">暂停</span>`;
    } else {
        startBtn.innerHTML = `${iconPlay}<span class="text">开始</span>`;
    }
}
startBtn.addEventListener('click', () => { timerId === null ? startTimer() : pauseTimer(); });

addTimeBtn.addEventListener('click', () => {
    if (!isWorking) { alert("休息时间就好好休息！"); return; }
    if (confirm("【防自我PUA警报🚨】\n\n你的眼睛需要休息！\n点击【取消】拒绝PUA按时休息，点击【确定】仍要延时。")) {
        timeLeft += 5 * 60;
        if (timerId !== null) {
            // 如果正在倒计时，必须把真实物理目标时间往后推 5 分钟
            targetTime += 5 * 60 * 1000;
        }
        updateTimeDisplay();
    }
});

skipBtn.addEventListener('click', () => {
    alarmSound.pause(); 
    pauseTimer();
    handleSessionEnd(); 
});

// 🔪 彻底移除了 stopBtn 的点击监听事件

resetDataBtn.addEventListener('click', () => {
    if (confirm("确定要清空今天的专注时间和所有待办任务吗？")) {
        const savedAudio = localStorage.getItem('customAudio');
        localStorage.clear();
        if (savedAudio) localStorage.setItem('customAudio', savedAudio);
        localStorage.setItem('lastDate', new Date().toDateString());
        location.reload(); 
    }
});

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && taskInput.value.trim() !== '') {
        tasks.push({ 
            text: taskInput.value.trim(), 
            completed: false, 
            quadrant: quadrantSelect.value 
        });
        taskInput.value = '';
        saveAndRenderTasks();
    }
});

function saveAndRenderTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
}

function renderTasks() {
    document.getElementById('q1List').innerHTML = '';
    document.getElementById('q2List').innerHTML = '';
    document.getElementById('q3List').innerHTML = '';
    document.getElementById('q4List').innerHTML = '';

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            <span class="task-text" contenteditable="true" onblur="editTask(${index}, this.innerText)">${task.text}</span>
            <div class="task-actions"><button onclick="deleteTask(${index})">${trashSVG}</button></div>
        `;
        
        const qId = task.quadrant || '1';
        const targetList = document.getElementById(`q${qId}List`);
        if(targetList) targetList.appendChild(li);
    });
}

window.toggleTask = (index) => { tasks[index].completed = !tasks[index].completed; saveAndRenderTasks(); };
window.editTask = (index, newText) => { newText.trim() === '' ? deleteTask(index) : (tasks[index].text = newText.trim(), saveAndRenderTasks()); };
window.deleteTask = (index) => { tasks.splice(index, 1); saveAndRenderTasks(); };

document.getElementById('closeBtn').addEventListener('click', () => ipcRenderer.send('window-close'));
document.getElementById('shrinkBtn').addEventListener('click', () => {
    ipcRenderer.send('window-shrink'); document.body.classList.add('mini-mode');
    document.getElementById('shrinkBtn').style.display = 'none'; document.getElementById('expandBtn').style.display = 'flex';
});
document.getElementById('expandBtn').addEventListener('click', () => {
    ipcRenderer.send('window-expand'); document.body.classList.remove('mini-mode');
    document.getElementById('shrinkBtn').style.display = 'flex'; document.getElementById('expandBtn').style.display = 'none';
});
// 🌟 新增：设置弹窗控制逻辑 (填空版)
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const cancelSettings = document.getElementById('cancelSettings');
const saveSettings = document.getElementById('saveSettings');

// 点开设置，读取当前数据填入输入框
settingsBtn.addEventListener('click', () => {
    document.getElementById('workTimeInput').value = userSettings.workTime;
    document.getElementById('shortRestInput').value = userSettings.shortRest;
    document.getElementById('longRestInput').value = userSettings.longRest;
    document.getElementById('longRestIntervalInput').value = userSettings.interval;
    settingsModal.style.display = 'flex';
});

cancelSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

// 保存设置
saveSettings.addEventListener('click', () => {
    // 获取用户输入的数字，如果乱填就给个保底值
    userSettings = {
        workTime: parseInt(document.getElementById('workTimeInput').value) || 25,
        shortRest: parseInt(document.getElementById('shortRestInput').value) || 5,
        longRest: parseInt(document.getElementById('longRestInput').value) || 15,
        interval: parseInt(document.getElementById('longRestIntervalInput').value) || 4
    };
    
    // 保存到本地
    localStorage.setItem('focusSettings', JSON.stringify(userSettings));
    
    // 更新当前内存里的变量
    WORK_TIME = userSettings.workTime * 60;
    REST_TIME = userSettings.shortRest * 60;
    LONG_REST_TIME = userSettings.longRest * 60;
    POMODORO_INTERVAL = userSettings.interval;
    
    // 如果当前没在倒计时，且是工作状态，立刻刷新时钟面板显示
    if (timerId === null && isWorking) {
        timeLeft = WORK_TIME;
        updateTimeDisplay();
    }
    
    settingsModal.style.display = 'none';
});