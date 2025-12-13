// ----------------------------
//  משתנים גלובליים
// ----------------------------
let globalLevel = 1;
let currentStage = 1;
let score = 0;
let levelScore = 0;
let lives = 3;
let gameRunning = false;
let starSpeed = 2;
let spawnRate = 0.025;
let bombChance = 0.1;
let combo = 1;
let comboCount = 0;
let maxCombo = 1;
let shieldTime = 0;
let speedBoostTime = 0;
let freezeTime = 0;
let magnetTime = 0;
let doublePointsTime = 0;
let lastStarType = null;
let stageStartTime = Date.now();
let levelStartTime = Date.now();
let starsCaught = 0;
let bombsAvoided = 0;
let blackholesAvoided = 0;
let lightningAvoided = 0;
let levelStarsCaught = 0;
let completedStages = 0;
let powerups = {};
let mouseX = 0;
let mouseY = 0;

// game-loop control
let gameLoopRunning = false;
let lastTimestamp = null;
let autoSaveIntervalId = null;
const SAVE_KEY = "catchStarsSave_v1";

// ----------------------------
//  ארגז כלים: cookie helpers (נשארים, optional)
// ----------------------------
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + ";expires=" + d.toUTCString() + ";path=/";
}

function getCookie(name) {
  const cname = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie || "");
  const ca = decodedCookie.split(';');
  for(let c of ca) {
    c = c.trim();
    if (c.indexOf(cname) === 0) {
      try {
        return JSON.parse(c.substring(cname.length, c.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ----------------------------
//  תבניות שלבים, סוגי כוכבים ופאוור-אפים
// ----------------------------
const baseStageTargets = [
    100, 150, 200, 280, 370, 480, 600, 750, 920, 1120,
    1350, 1620, 1930, 2280, 2670, 3100, 3570, 4080, 4630, 5220
];

const stageNames = [
    "התחלה", "צעדים ראשונים", "מתרגל", "מבין", "מתמיד", 
    "מתחמם", "מתקדם", "מאתגר", "קשה", "מורכב",
    "מקצועי", "מומחה", "אמן", "וירטואוז", "גאון",
    "מדהים", "אגדי", "בלתי יתואר", "על אנושי", "מושלם"
];

const baseStarTypes = [
    { emoji: '⭐', basePoints: 5, chance: 0.4, class: 'star-regular' },
    { emoji: '🌟', basePoints: 10, chance: 0.3, class: 'star-blue' },
    { emoji: '💫', basePoints: 20, chance: 0.15, class: 'star-silver' },
    { emoji: '🌠', basePoints: 50, chance: 0.08, class: 'star-gold' },
    { emoji: '🎆', basePoints: 100, chance: 0.02, class: 'star-rainbow' }
];

const powerupTypes = [
    { emoji: '🛡️', type: 'shield', chance: 0.04 },
    { emoji: '❤️', type: 'life', chance: 0.03 },
    { emoji: '⚡', type: 'speed', chance: 0.04 },
    { emoji: '❄️', type: 'freeze', chance: 0.02 },
    { emoji: '🧲', type: 'magnet', chance: 0.02 },
    { emoji: '💎', type: 'double', chance: 0.02 }
];

// ----------------------------
//  אלמנטים DOM
// ----------------------------
const gameContainer = document.getElementById('gameContainer');
const player = document.getElementById('player');

// ----------------------------
//  עדכון UI
// ----------------------------
function updateScore() {
    document.getElementById('score').textContent = score;
}
function updateLives() {
    document.getElementById('lives').textContent = lives;
}
function updateCombo() {
    document.getElementById('combo').textContent = 'x' + combo;
    document.getElementById('combo').style.color = combo > 1 ? '#4caf50' : '#fff';
}
function updateGlobalLevel() {
    document.getElementById('globalLevel').textContent = 
        `רמה גלובלית: ${globalLevel} (מכפיל נקודות: x${globalLevel})`;
}
function updateLegend() {
    const freezeLegend = document.getElementById('freezeLegend');
    const magnetLegend = document.getElementById('magnetLegend');
    const doubleLegend = document.getElementById('doubleLegend');
    
    if (freezeLegend && globalLevel >= 2) {
        freezeLegend.style.opacity = '1';
        freezeLegend.style.color = '#00bcd4';
    }
    
    if (magnetLegend && globalLevel >= 3) {
        magnetLegend.style.opacity = '1';
        magnetLegend.style.color = '#9c27b0';
    }
    
    if (doubleLegend && globalLevel >= 4) {
        doubleLegend.style.opacity = '1';
        doubleLegend.style.color = '#e91e63';
    }
}
function updateSpecialEffects() {
    let special = 'אין';
    
    if (doublePointsTime > 0) {
        special = `כפול: ${Math.ceil(doublePointsTime/60)}`;
        document.getElementById('special').style.color = '#e91e63';
    } else if (magnetTime > 0) {
        special = `מגנט: ${Math.ceil(magnetTime/60)}`;
        document.getElementById('special').style.color = '#9c27b0';
    } else if (freezeTime > 0) {
        special = `הקפאה: ${Math.ceil(freezeTime/60)}`;
        document.getElementById('special').style.color = '#00bcd4';
    } else if (speedBoostTime > 0) {
        special = `מהירות: ${Math.ceil(speedBoostTime/60)}`;
        document.getElementById('special').style.color = '#ff9800';
    } else {
        document.getElementById('special').style.color = '#666';
    }
    
    document.getElementById('special').textContent = special;
    
    if (shieldTime > 0) {
        document.getElementById('shield').textContent = Math.ceil(shieldTime/60);
        document.getElementById('shield').style.color = '#2196f3';
        player.classList.add('player-shield');
    } else {
        document.getElementById('shield').textContent = '0';
        document.getElementById('shield').style.color = '#666';
        player.classList.remove('player-shield');
    }
}

function updateStageInfo() {
    const target = Math.floor(baseStageTargets[currentStage - 1] * globalLevel);
    const stageName = stageNames[currentStage - 1];
    document.getElementById('stageTitle').textContent = `שלב ${currentStage}: ${stageName}`;
    document.getElementById('stageGoal').textContent = `יעד: ${target} נקודות`;
    document.getElementById('stageNum').textContent = currentStage;
    updateProgress();
}

function updateProgress() {
    const target = Math.floor(baseStageTargets[currentStage - 1] * globalLevel);
    const progress = Math.min((score / target) * 100, 100);
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = `${score} / ${target}`;
}

function updateLevelProgressUI() {
    document.getElementById('levelScore').textContent = levelScore;
    document.getElementById('completedStages').textContent = completedStages;
    const pct = Math.min(100, (completedStages / 20) * 100);
    document.getElementById('levelProgressFill').style.width = pct + '%';
    document.getElementById('levelProgressText').textContent = `${completedStages}/20`;
}

// ----------------------------
//  שמירה / טעינה מלאה (localStorage)
// ----------------------------
function saveGameState(reason = '', stageCompleted = false) {
    try {
        if (stageCompleted) {
            currentStage = Math.min(currentStage + 1, 20);
        }
        const state = {
            globalLevel, currentStage, score, levelScore, lives,
            starSpeed, spawnRate, bombChance, combo, comboCount, maxCombo,
            shieldTime, speedBoostTime, freezeTime, magnetTime, doublePointsTime,
            lastStarType, stageStartTime, levelStartTime,
            starsCaught, bombsAvoided, blackholesAvoided, lightningAvoided,
            levelStarsCaught, completedStages, mouseX, mouseY,
            gameRunning, savedAt: Date.now()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Save failed", e);
    }
}

function loadGameState() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return false;
        const state = JSON.parse(saved);

        globalLevel = state.globalLevel ?? globalLevel;
        currentStage = state.currentStage ?? currentStage;
        score = state.score ?? score;
        levelScore = state.levelScore ?? levelScore;
        lives = state.lives ?? lives;
        starSpeed = state.starSpeed ?? (1.5 + (globalLevel * 0.2) + (currentStage * 0.05));
        spawnRate = state.spawnRate ?? spawnRate;
        bombChance = state.bombChance ?? bombChance;
        combo = state.combo ?? combo;
        comboCount = state.comboCount ?? comboCount;
        maxCombo = state.maxCombo ?? maxCombo;
        shieldTime = state.shieldTime ?? shieldTime;
        speedBoostTime = state.speedBoostTime ?? speedBoostTime;
        freezeTime = state.freezeTime ?? freezeTime;
        magnetTime = state.magnetTime ?? magnetTime;
        doublePointsTime = state.doublePointsTime ?? doublePointsTime;
        lastStarType = state.lastStarType ?? lastStarType;
        stageStartTime = state.stageStartTime ?? Date.now();
        levelStartTime = state.levelStartTime ?? Date.now();
        starsCaught = state.starsCaught ?? starsCaught;
        bombsAvoided = state.bombsAvoided ?? bombsAvoided;
        blackholesAvoided = state.blackholesAvoided ?? blackholesAvoided;
        lightningAvoided = state.lightningAvoided ?? lightningAvoided;
        levelStarsCaught = state.levelStarsCaught ?? levelStarsCaught;
        completedStages = state.completedStages ?? completedStages;
        mouseX = state.mouseX ?? mouseX;
        mouseY = state.mouseY ?? mouseY;
        gameRunning = state.gameRunning ?? false;

        updateGlobalLevel();
        updateLegend();
        updateScore();
        updateLives();
        updateCombo();
        updateSpecialEffects();
        updateStageInfo();
        updateLevelProgressUI();

        if (mouseX && mouseY) {
            const rect = gameContainer.getBoundingClientRect();
            mouseX = Math.max(20, Math.min(rect.width - 20, mouseX));
            mouseY = Math.max(20, Math.min(rect.height - 20, mouseY));
            player.style.left = (mouseX - 20) + 'px';
            player.style.top = (mouseY - 20) + 'px';
        }

        const target = Math.floor(baseStageTargets[currentStage - 1] * globalLevel);

        if (!gameRunning) {
            if (score >= target) {
                currentStage = Math.min(20, currentStage + 1);
            } else if (lives <= 0) {
                lives = 3;
            }
            initStage();
        } else {
            resumeGame();
        }
        return true;
    } catch (e) {
        console.error("Load failed", e);
        return false;
    }
}

function clearSave() {
    localStorage.removeItem(SAVE_KEY);
}

// ----------------------------
//  מיקום העכבר / שחקן
// ----------------------------
function updatePlayerPosition(clientX, clientY) {
    const rect = gameContainer.getBoundingClientRect();
    mouseX = clientX - rect.left;
    mouseY = clientY - rect.top;
    mouseX = Math.max(20, Math.min(rect.width - 20, mouseX));
    mouseY = Math.max(20, Math.min(rect.height - 20, mouseY));
    player.style.left = (mouseX - 20) + 'px';
    player.style.top = (mouseY - 20) + 'px';
}

gameContainer.addEventListener('mousemove', (e) => updatePlayerPosition(e.clientX, e.clientY));
gameContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) updatePlayerPosition(e.touches[0].clientX, e.touches[0].clientY);
});
gameContainer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) updatePlayerPosition(e.touches[0].clientX, e.touches[0].clientY);
});

// ----------------------------
//  יצירת אובייקטים במשחק
// ----------------------------
function createStar() {
    let rand = Math.random();
    let cumulative = 0;
    let chosen = baseStarTypes[0];
    for (let type of baseStarTypes) {
        cumulative += type.chance;
        if (rand <= cumulative) {
            chosen = type;
            break;
        }
    }
    
    const star = document.createElement('div');
    star.className = 'star ' + chosen.class;
    star.textContent = chosen.emoji;
    star.dataset.points = chosen.basePoints * globalLevel;
    
    star.style.left = Math.random() * (gameContainer.clientWidth - 30) + 'px';
    star.style.top = '-30px';
    
    gameContainer.appendChild(star);
}

function createBomb() {
    const bomb = document.createElement('div');
    bomb.className = 'bomb';
    bomb.textContent = '💥';
    bomb.style.left = Math.random() * (gameContainer.clientWidth - 30) + 'px';
    bomb.style.top = '-30px';
    gameContainer.appendChild(bomb);
}

function createBlackhole() {
    const bh = document.createElement('div');
    bh.className = 'blackhole';
    bh.textContent = '🕳️';
    bh.style.left = Math.random() * (gameContainer.clientWidth - 30) + 'px';
    bh.style.top = '-30px';
    gameContainer.appendChild(bh);
}

function createLightning() {
    const l = document.createElement('div');
    l.className = 'lightning';
    l.textContent = '⛈️';
    l.style.left = Math.random() * (gameContainer.clientWidth - 30) + 'px';
    l.style.top = '-30px';
    gameContainer.appendChild(l);
}

function createPowerup() {
    const avail = powerupTypes.filter(p => {
        if (p.type === 'freeze' && globalLevel < 2) return false;
        if (p.type === 'magnet' && globalLevel < 3) return false;
        if (p.type === 'double' && globalLevel < 4) return false;
        return true;
    });
    let rand = Math.random();
    let cumulative = 0;
    let chosen = avail[0];
    for (let p of avail) {
        cumulative += p.chance;
        if (rand <= cumulative) {
            chosen = p;
            break;
        }
    }
    const pu = document.createElement('div');
    pu.className = 'powerup';
    pu.textContent = chosen.emoji;
    pu.dataset.type = chosen.type;
    pu.style.left = Math.random() * (gameContainer.clientWidth - 30) + 'px';
    pu.style.top = '-30px';
    gameContainer.appendChild(pu);
}
// ----------------------------
//  בדיקת התנגשות
// ----------------------------
function isColliding(el1, el2) {
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

// ----------------------------
//  עדכון מיקום אובייקטים
// ----------------------------
function moveObjects() {
    const objs = Array.from(gameContainer.querySelectorAll('.star, .bomb, .blackhole, .lightning, .powerup'));
    for (let obj of objs) {
        let top = parseFloat(obj.style.top);
        let speed = starSpeed;

        if (obj.classList.contains('bomb')) speed *= 1.2;
        if (obj.classList.contains('blackhole')) speed *= 0.8;
        if (obj.classList.contains('lightning')) speed *= 1.5;

        if (freezeTime > 0 && !obj.classList.contains('powerup')) {
            speed = speed * 0.3;
        }
        if (speedBoostTime > 0 && obj.classList.contains('star')) {
            speed = speed * 1.3;
        }

        obj.style.top = (top + speed) + 'px';

        // אם עבר את התחתית
        if (top > gameContainer.clientHeight) {
            if (obj.classList.contains('star')) {
                combo = 1;
                updateCombo();
            }
            if (obj.classList.contains('bomb')) bombsAvoided++;
            if (obj.classList.contains('blackhole')) blackholesAvoided++;
            if (obj.classList.contains('lightning')) lightningAvoided++;
            obj.remove();
            continue;
        }

        // בדיקת התנגשות עם השחקן
        if (isColliding(player, obj)) {
            if (obj.classList.contains('star')) {
                let pts = parseInt(obj.dataset.points);
                if (doublePointsTime > 0) pts *= 2;
                score += pts * combo;
                levelScore += pts * combo;
                starsCaught++;
                levelStarsCaught++;
                comboCount++;
                if (comboCount % 5 === 0) combo++;
                if (combo > maxCombo) maxCombo = combo;
                updateScore();
                updateCombo();
                updateProgress();
                showFloatingText("+" + pts, obj, "points-text");
                obj.remove();
            } else if (obj.classList.contains('bomb') || obj.classList.contains('blackhole') || obj.classList.contains('lightning')) {
                if (shieldTime > 0) {
                    shieldTime -= 60;
                    updateSpecialEffects();
                    obj.remove();
                } else {
                    lives--;
                    updateLives();
                    combo = 1;
                    updateCombo();
                    if (lives <= 0) {
                        endStage(false);
                    }
                    obj.remove();
                }
            } else if (obj.classList.contains('powerup')) {
                const type = obj.dataset.type;
                if (type === 'shield') shieldTime = 600;
                if (type === 'life') lives++;
                if (type === 'speed') speedBoostTime = 600;
                if (type === 'freeze') freezeTime = 300;
                if (type === 'magnet') magnetTime = 300;
                if (type === 'double') doublePointsTime = 300;
                updateLives();
                updateSpecialEffects();
                obj.remove();
            }
        } else if (magnetTime > 0 && obj.classList.contains('star')) {
            // אפקט מגנט
            const px = player.offsetLeft + player.offsetWidth/2;
            const py = player.offsetTop + player.offsetHeight/2;
            const ox = obj.offsetLeft + obj.offsetWidth/2;
            const oy = obj.offsetTop + obj.offsetHeight/2;
            const dx = px - ox;
            const dy = py - oy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 150) {
                obj.style.left = (obj.offsetLeft + dx*0.05) + 'px';
                obj.style.top = (obj.offsetTop + dy*0.05) + 'px';
            }
        }
    }
}

// ----------------------------
//  טקסט צף לניקוד/קומבו
// ----------------------------
function showFloatingText(text, baseElement, className) {
    const txt = document.createElement('div');
    txt.className = className;
    txt.textContent = text;
    txt.style.left = baseElement.style.left;
    txt.style.top = baseElement.style.top;
    gameContainer.appendChild(txt);
    setTimeout(() => txt.remove(), 1000);
}

// ----------------------------
//  לולאת המשחק
// ----------------------------
function gameLoop(timestamp) {
    if (!gameRunning) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (Math.random() < spawnRate) createStar();
    if (Math.random() < 0.003 * globalLevel) createBomb();
    if (Math.random() < 0.0015 * globalLevel) createBlackhole();
    if (Math.random() < 0.001 * globalLevel) createLightning();
    if (Math.random() < 0.002) createPowerup();

    moveObjects();

    // עדכון טיימרים של אפקטים
    if (shieldTime > 0) shieldTime--;
    if (speedBoostTime > 0) speedBoostTime--;
    if (freezeTime > 0) freezeTime--;
    if (magnetTime > 0) magnetTime--;
    if (doublePointsTime > 0) doublePointsTime--;
    updateSpecialEffects();

    // בדיקה אם עברנו את היעד
    const target = Math.floor(baseStageTargets[currentStage - 1] * globalLevel);
    if (score >= target) {
        endStage(true);
        return;
    }

    requestAnimationFrame(gameLoop);
}
// ----------------------------
//  סיום שלב
// ----------------------------
function endStage(success) {
    gameRunning = false;

    if (success) {
        completedStages++;
        document.getElementById('completedStage').textContent = currentStage;
        document.getElementById('completedStageName').textContent = stageNames[currentStage - 1];
        document.getElementById('stageScore').textContent = score;
        document.getElementById('stageTime').textContent = Math.floor((Date.now() - stageStartTime) / 1000);
        document.getElementById('stageMaxCombo').textContent = maxCombo;
        document.getElementById('stageStarsCaught').textContent = starsCaught;
        document.getElementById('stageBombsAvoided').textContent = bombsAvoided;
        document.getElementById('stageBlackholesAvoided').textContent = blackholesAvoided;
        document.getElementById('stageLightningAvoided').textContent = lightningAvoided;
        updateLevelProgressUI();

        if (completedStages >= 20) {
            globalLevel++;
            completedStages = 0;
            score = 0;
            levelScore = 0;
            document.getElementById('completedLevel').textContent = globalLevel - 1;
            document.getElementById('newLevel').textContent = globalLevel;
            document.getElementById('newMultiplier').textContent = globalLevel;
            updateGlobalLevel();
            updateLegend();
            document.getElementById('levelComplete').style.display = 'block';
        } else {
            document.getElementById('stageComplete').style.display = 'block';
        }

        saveGameState("stageComplete", true);
    } else {
        document.getElementById('failScore').textContent = score;
        document.getElementById('failTarget').textContent = Math.floor(baseStageTargets[currentStage - 1] * globalLevel);
        document.getElementById('finalStats').textContent =
            `קומבו מקסימלי: ${maxCombo}, כוכבים: ${starsCaught}, פצצות שנמנעו: ${bombsAvoided}`;
        document.getElementById('gameOver').style.display = 'block';
        saveGameState("stageFailed", false);
    }
}

// ----------------------------
//  שליטה במשחק
// ----------------------------
function retryStage() {
    score = 0;
    combo = 1;
    lives = 3;
    shieldTime = speedBoostTime = freezeTime = magnetTime = doublePointsTime = 0;
    starsCaught = bombsAvoided = blackholesAvoided = lightningAvoided = 0;
    maxCombo = 1;
    gameContainer.querySelectorAll('.star, .bomb, .blackhole, .lightning, .powerup').forEach(el => el.remove());
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('stageComplete').style.display = 'none';
    document.getElementById('levelComplete').style.display = 'none';
    initStage();
}

function nextStage() {
    score = 0;
    combo = 1;
    starsCaught = bombsAvoided = blackholesAvoided = lightningAvoided = 0;
    maxCombo = 1;
    gameContainer.querySelectorAll('.star, .bomb, .blackhole, .lightning, .powerup').forEach(el => el.remove());
    document.getElementById('stageComplete').style.display = 'none';
    currentStage = Math.min(currentStage + 1, 20);
    initStage();
}

function nextLevel() {
    score = 0;
    combo = 1;
    levelScore = 0;
    lives = 3;
    completedStages = 0;
    starsCaught = bombsAvoided = blackholesAvoided = lightningAvoided = 0;
    maxCombo = 1;
    gameContainer.querySelectorAll('.star, .bomb, .blackhole, .lightning, .powerup').forEach(el => el.remove());
    document.getElementById('levelComplete').style.display = 'none';
    currentStage = 1;
    initStage();
}

// ----------------------------
//  אתחול שלב
// ----------------------------
function initStage() {
    stageStartTime = Date.now();
    score = 0;
    combo = 1;
    starsCaught = bombsAvoided = blackholesAvoided = lightningAvoided = 0;
    maxCombo = 1;
    updateScore();
    updateLives();
    updateCombo();
    updateSpecialEffects();
    updateStageInfo();
    updateLevelProgressUI();
    gameRunning = true;
    lastTimestamp = null;
    requestAnimationFrame(gameLoop);
}

// ----------------------------
//  המשך משחק טעון
// ----------------------------
function resumeGame() {
    gameRunning = true;
    lastTimestamp = null;
    requestAnimationFrame(gameLoop);
}

// ----------------------------
//  התחלה אוטומטית
// ----------------------------
window.addEventListener('load', () => {
    if (!loadGameState()) {
        initStage();
    }
    document.getElementById('saveBtn').addEventListener('click', () => {
        saveGameState("manualSave");
    });
    autoSaveIntervalId = setInterval(() => {
        if (gameRunning) saveGameState("autosave");
    }, 30000);
});
