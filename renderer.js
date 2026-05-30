const { ipcRenderer } = require('electron');

// 🌟 升级：读取本地用户自定义设置
const defaultSettings = { workTime: 25, shortRest: 5, longRest: 15, interval: 4, lunchEnabled: false, lunchTime: '12:00' };
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
let targetTime = 0; 
let sessionStartTime = 0; 
let sessionStartTotalSeconds = 0; 
let sessionStartTaskSeconds = 0; // 新增：记录当前任务开始时的已专注时长

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
// 【新加代码】获取午休相关元素
let lastLunchTriggerDate = localStorage.getItem('lastLunchDate') || "";
const lunchAlarmSound = document.getElementById('lunchAlarmSound');
const lunchAudioUpload = document.getElementById('lunchAudioUpload');
const lunchModal = document.getElementById('lunchModal');
const closeLunchModal = document.getElementById('closeLunchModal');

// 恢复保存的午休铃声
const savedLunchAudio = localStorage.getItem('lunchCustomAudio');
if (savedLunchAudio) lunchAlarmSound.src = savedLunchAudio;

// 午休铃声上传逻辑
lunchAudioUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            lunchAlarmSound.src = e.target.result;
            localStorage.setItem('lunchCustomAudio', e.target.result); 
            alert("午休提示音设置成功并已保存！");
            document.querySelector('label[for="lunchAudioUpload"]').innerText = "✅ 已上传";
        };
        reader.readAsDataURL(file);
    }
});

// 关闭午休弹窗逻辑
closeLunchModal.addEventListener('click', () => {
    lunchModal.style.display = 'none';
    lunchAlarmSound.pause();
});
// 🌟 新增获取日报与任务元素
const currentTaskSelect = document.getElementById('currentTaskSelect');
const exportBtn = document.getElementById('exportBtn');
const reportModal = document.getElementById('reportModal');
const reportTextarea = document.getElementById('reportTextarea');
const closeReport = document.getElementById('closeReport');
const copyReport = document.getElementById('copyReport');

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
    
    targetTime = Date.now() + (timeLeft * 1000);
    sessionStartTime = Date.now();
    sessionStartTotalSeconds = totalSeconds;
    
    // 获取当前选中的任务
    const selectedTaskIndex = currentTaskSelect.value;
    if (selectedTaskIndex !== "") {
        sessionStartTaskSeconds = tasks[selectedTaskIndex].focusSeconds || 0;
    }

    timerId = setInterval(() => {
        const nowTime = new Date();
        const now = nowTime.getTime();
        
        // 🌟 新加逻辑：检测午休时间
        const currentTimeStr = nowTime.getHours().toString().padStart(2, '0') + ':' + nowTime.getMinutes().toString().padStart(2, '0');
        const todayStr = nowTime.toDateString();

        if (userSettings.lunchEnabled && currentTimeStr === userSettings.lunchTime && lastLunchTriggerDate !== todayStr) {
            // 到达设定的午休时间，且今天还没触发过
            pauseTimer();
            lastLunchTriggerDate = todayStr;
            localStorage.setItem('lastLunchDate', todayStr);
            
            if (lunchAlarmSound.src) {
                lunchAlarmSound.currentTime = 0;
                lunchAlarmSound.play().catch(()=>console.log("音频拦截"));
            }
            lunchModal.style.display = 'flex';
            return; // 拦截本次循环
        }

        // --- 以下是原有的倒计时逻辑，保持不变 ---
        timeLeft = Math.max(0, Math.round((targetTime - now) / 1000));
        
        if (isWorking) {
            const addedSeconds = Math.round((now - sessionStartTime) / 1000);
            totalSeconds = sessionStartTotalSeconds + addedSeconds;
            updateTotalTimeDisplay(); 
            
            if (selectedTaskIndex !== "") {
                tasks[selectedTaskIndex].focusSeconds = sessionStartTaskSeconds + addedSeconds;
            }
        }

        updateTimeDisplay();

        if (timeLeft === 0) {
            if(alarmSound.src) {
                alarmSound.currentTime = 0;
                alarmSound.play().catch(()=>console.log("音频拦截"));
            }
            handleSessionEnd();
        }
    }, 200);
}

function pauseTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    startBtn.innerHTML = `${iconPlay}<span class="text">继续</span>`;
    localStorage.setItem('totalFocusSeconds', totalSeconds); 
    saveAndRenderTasks(); // 暂停时把当前任务增加的时间写进硬盘
}

function handleSessionEnd() {
    // 🌟 强行视觉打断：如果当前是小窗模式，自动放大并居中主界面！
    if (document.body.classList.contains('mini-mode')) {
        ipcRenderer.send('window-expand'); 
        document.body.classList.remove('mini-mode');
        document.getElementById('shrinkBtn').style.display = 'flex'; 
        document.getElementById('expandBtn').style.display = 'none';
    }
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

// 辅助函数：把秒变成好看的汉字
function formatTaskTime(seconds) {
    if (!seconds) return "0 分钟";
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} 小时 ${m} 分钟`;
    return `${m} 分钟`;
}

function renderTasks() {
    document.getElementById('q1List').innerHTML = '';
    document.getElementById('q2List').innerHTML = '';
    document.getElementById('q3List').innerHTML = '';
    document.getElementById('q4List').innerHTML = '';
    
    // 记住当前下拉框选的是哪个
    const currentSelected = currentTaskSelect.value;
    currentTaskSelect.innerHTML = '<option value="">🎯 当前未关联任务</option>';

    tasks.forEach((task, index) => {
        // 🌟 更新下拉框
        if (!task.completed) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = task.text;
            if (currentSelected == index) option.selected = true;
            currentTaskSelect.appendChild(option);
        }

        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        // 🌟 加入 title 属性，鼠标悬停直接显示时间
        li.title = `累计专注: ${formatTaskTime(task.focusSeconds)}`;
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

// 🌟 监听切换任务：自动暂停！
currentTaskSelect.addEventListener('change', () => {
    if (timerId !== null) {
        pauseTimer(); // 切换任务立刻打断旧计时
    }
});

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
    // 🌟 新增：读取午休设置
    document.getElementById('lunchBreakToggle').checked = userSettings.lunchEnabled || false;
    document.getElementById('lunchTimeInput').value = userSettings.lunchTime || '12:00';
    
    settingsModal.style.display = 'flex';
});

cancelSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});


// 保存设置
saveSettings.addEventListener('click', () => {
    userSettings = {
        workTime: parseInt(document.getElementById('workTimeInput').value) || 25,
        shortRest: parseInt(document.getElementById('shortRestInput').value) || 5,
        longRest: parseInt(document.getElementById('longRestInput').value) || 15,
        interval: parseInt(document.getElementById('longRestIntervalInput').value) || 4,
        // 🌟 新增：保存午休设置
        lunchEnabled: document.getElementById('lunchBreakToggle').checked,
        lunchTime: document.getElementById('lunchTimeInput').value || '12:00'
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
// 🌟 自动生成日报核心逻辑
// 【将原来的逻辑替换为下面的】：
exportBtn.addEventListener('click', () => {
    const todayStr = new Date().toLocaleDateString('zh-CN', {month: 'long', day: 'numeric'}) + " 工作日报";
    
    // 按象限把任务归类
    let q1 = [], q2 = [], q3 = [], q4 = []; // 🌟 新增 q4
    tasks.forEach(t => {
        let textLine = `  - ${t.text} (${formatTaskTime(t.focusSeconds)}) [${t.completed ? '✅已完成' : '❌未完成'}]`;
        if (t.quadrant == '1') q1.push(textLine);
        if (t.quadrant == '2') q2.push(textLine);
        if (t.quadrant == '3') q3.push(textLine);
        if (t.quadrant == '4') q4.push(textLine); // 🌟 新增判定
    });

    // 拼装绝美模板
    const reportText = `【🎯 今日一句话目标（规划-塔尖）】
（请写下今天最重要的事）

【📝 任务金字塔（规划-塔身与塔基）】

🔥 重要紧急：
${q1.length > 0 ? q1.join('\n') : '  - 无'}

🏃 重要不紧急：
${q2.length > 0 ? q2.join('\n') : '  - 无'}

🧹 紧急不重要：
${q3.length > 0 ? q3.join('\n') : '  - 无'}

☕ 不重不急（碎片化）：
${q4.length > 0 ? q4.join('\n') : '  - 无'}

---
【💡 今日一句话总结（复盘-塔尖）】
（对今天的整体评价）

【🔍 复盘金字塔（复盘-塔身与塔基）】

✅ 亮点与交付（Keep）：
1. 

❌ 卡点与原因（Problem）：
1. 

🚀 明日调整（Try）：
1. 
`;
    
    reportTextarea.value = reportText;
    reportModal.style.display = 'flex';
});

closeReport.addEventListener('click', () => reportModal.style.display = 'none');

copyReport.addEventListener('click', () => {
    reportTextarea.select();
    document.execCommand('copy');
    const originalText = copyReport.innerText;
    copyReport.innerText = "✅ 复制成功！快去粘贴吧";
    setTimeout(() => { copyReport.innerText = originalText; }, 2000);
});