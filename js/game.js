const firebaseConfig = {
  apiKey: "AIzaSyAouoqMYHeOxNonsvOvkKthEGEQuXq8QvA",
  authDomain: "neon-strike018.firebaseapp.com",
  databaseURL: "https://neon-strike018-default-rtdb.firebaseio.com",
  projectId: "neon-strike018",
  storageBucket: "neon-strike018.firebasestorage.app",
  messagingSenderId: "169656109485",
  appId: "1:169656109485:web:7048cab48fcf16d7427924",
  measurementId: "G-N2PV9T3DPT"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Função 1: Salva uma nova pontuação no Firebase
function saveScore(playerName, score) {
    if (!playerName) playerName = "Anónimo";
    
    db.ref('leaderboard').push({
        name: playerName,
        score: score,
        timestamp: Date.now()
    });
}

// Função 2: Atualiza a lista na tela automaticamente quando entra uma nova pontuação
function listenToLeaderboard() {
    db.ref('leaderboard').orderByChild('score').limitToLast(5).on('value', (snapshot) => {
        const scoresList = document.getElementById('scoresList');
        if (!scoresList) return;
        
        scoresList.innerHTML = '';
        const scores = [];
        
        snapshot.forEach((child) => {
            scores.push(child.val());
        });
        
        scores.reverse(); // Maior pontuação primeiro

        scores.forEach((entry) => {
            const li = document.createElement('li');
            li.textContent = `${entry.name}: ${entry.score} pts`;
            scoresList.appendChild(li);
        });
    });
}

// Ativa a escuta do ranking
listenToLeaderboard();

//----------------------------------------------------------------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- BANCO DE SKINS DE HERÓIS ---
const HERO_SKINS = [
    { id: 'cyber', name: 'Cyber Hero', color: '#00f0ff', eyeColor: '#ffffff', price: 0, heroType: 'cyber' },
    { id: 'capitan', name: 'Capitão Neon', color: '#0033cc', eyeColor: '#ffffff', price: 100, heroType: 'capitan' },
    { id: 'flash', name: 'Flash Neon', color: '#cc0000', eyeColor: '#ffe600', price: 250, heroType: 'flash' },
    { id: 'bat', name: 'Sombra', color: '#11111a', eyeColor: '#00f0ff', price: 500, heroType: 'bat' },
    { id: 'iron', name: 'Iron Hero', color: '#b30024', eyeColor: '#00ffff', price: 1000, heroType: 'iron' },
    { id: 'thor', name: 'Deus Trovão', color: '#1e3a8a', eyeColor: '#60a5fa', price: 2500, heroType: 'thor' },
    { id: 'hacker', name: 'HACKER SUPREMO', color: '#00ff66', eyeColor: '#000000', price: 100000, heroType: 'hacker' }
];

// ARMAS
const ALL_WEAPONS = {
    pistol: { id: 'pistol', name: 'Pistola Neon', color: '#ff0055', speed: 12, damage: 25, delay: 240, count: 1, spread: 0, ammo: Infinity },
    shotgun: { id: 'shotgun', name: 'Escopeta', color: '#ffea00', speed: 10, damage: 16, delay: 580, count: 5, spread: 0.3, ammo: 60 },
    rifle: { id: 'rifle', name: 'Rifle Laser', color: '#ff0055', speed: 16, damage: 18, delay: 130, count: 1, spread: 0.04, ammo: 180 },
    launcher: { id: 'launcher', name: 'Lança-Granadas', color: '#00ff66', speed: 8, damage: 95, delay: 850, count: 1, spread: 0, ammo: 25, explosive: true }
};

const SHOP_ITEMS = [
    { id: 'shotgun', type: 'weapon', name: 'Escopeta', price: 40 },
    { id: 'rifle', type: 'weapon', name: 'Rifle Laser', price: 80 },
    { id: 'launcher', type: 'weapon', name: 'Lança-Granadas', price: 120 }
];

// BANCO DE UPGRADES DA PARTIDA
const INGAME_UPGRADES = [
    { id: 'rapid', type: 'passive', name: 'Tiro Rápido', desc: '+30% Cadência', icon: '⚡' },
    { id: 'damage', type: 'passive', name: 'Super Carga', desc: '+30% Dano Base', icon: '💥' },
    { id: 'speed', type: 'passive', name: 'Agilidade', desc: '+20% Vel. Movimento', icon: '👟' },
    { id: 'double', type: 'passive', name: 'Disparo Duplo', desc: '+1 Projétil Extra', icon: '🔫' },
    { id: 'heal', type: 'passive', name: 'Cura Total', desc: 'Recupera 50 HP', icon: '❤️' },
    
    // ATIVAS DE PARTIDA (TECLAS E / R)
    { id: 'teleport', type: 'active', name: 'Teleporte', desc: 'Teleporta para frente', icon: '🌀' },
    { id: 'bullet_bomb', type: 'active', name: 'Bomba de Tiros', desc: 'Explosão em 360°', icon: '💣' },
    { id: 'spin_shot', type: 'active', name: 'Tornado de Tiros', desc: 'Gira atirando por 5s', icon: '🌪️' },
    { id: 'confuse', type: 'active', name: 'Invisível & Confuso', desc: 'Invisível por 5s', icon: '❓' }
];

const ENEMY_COLOR_TIERS = ['#ff0055', '#a855f7', '#f97316', '#eab308', '#06b6d4', '#10b981'];

// PERSISTÊNCIA
let accounts = JSON.parse(localStorage.getItem('ns_accounts')) || {};
let rankings = JSON.parse(localStorage.getItem('ns_rankings')) || [];
let currentUser = null;

function saveAccounts() { localStorage.setItem('ns_accounts', JSON.stringify(accounts)); }
function saveRankings() { localStorage.setItem('ns_rankings', JSON.stringify(rankings)); }

function updateLeaderboard(username, highScore) {
    const existing = rankings.find(r => r.name === username);
    if (existing) { if (highScore > existing.score) existing.score = highScore; }
    else rankings.push({ name: username, score: highScore });
    rankings.sort((a, b) => b.score - a.score);
    saveRankings();
}

// ESTADO DO JOGO
let player, bullets, enemies, particles, floatTexts, activeBoss = null;
let keys = {};
let mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };
let score = 0, sessionCoins = 0;
let isPlaying = false, isPaused = false, isGameOver = false;
let lastShotTime = 0, screenShake = 0;

let currentScoreGoal = 100;
let goalStep = 150;
let enemyLevelMultiplier = 1;
let nextBossScore = 5000;

// MULTIPLICADORES DA PARTIDA
let fireRateMult = 1, damageMult = 1, extraProjectiles = 0;
let passiveCount = 0;

let activeSkillSlot1 = null;
let activeSkillSlot2 = null;

// JOGADOR
class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 20;
        this.speed = 4.2;
        this.health = 100;
        this.maxHealth = 100;
        this.currentWeaponIndex = 0;
        this.angle = 0;

        // Habilidade da Skin (Q)
        this.isInvincible = false;
        this.isUnderground = false;
        this.activeBeam = false;
        this.abilityTimer = 0;
        this.abilityCooldown = 0;
        this.pendingHeroCooldown = 0; // Armazena a recarga até a habilidade acabar

        // Habilidades Ativas da Partida (E / R)
        this.skill1Cooldown = 0;
        this.skill2Cooldown = 0;
        this.activeSkill1Timer = 0;
        this.activeSkill2Timer = 0;

        this.isSpinning = false;
        this.isInvisibleConfuse = false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const skin = HERO_SKINS.find(s => s.id === currentUser.equippedSkin) || HERO_SKINS[0];

        if (this.isInvisibleConfuse) ctx.globalAlpha = 0.25;

        if (skin.heroType === 'flash') {
            particles.push(new Particle(this.x + (Math.random()-0.5)*15, this.y + (Math.random()-0.5)*15, '#ffe600'));
        } else if (skin.heroType === 'thor') {
            if (Math.random() < 0.3) particles.push(new Particle(this.x + (Math.random()-0.5)*20, this.y + (Math.random()-0.5)*20, '#60a5fa'));
        } else if (skin.heroType === 'hacker') {
            if (Math.random() < 0.4) {
                floatTexts.push(new FloatingText(Math.random() > 0.5 ? '1' : '0', this.x + (Math.random()-0.5)*30, this.y + (Math.random()-0.5)*30, '#00ff66'));
            }
        }

        if (this.isUnderground) {
            ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fill(); ctx.restore(); return;
        }

        if (this.isInvincible) {
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 4; ctx.stroke();
        }

        if (skin.heroType === 'bat') {
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-28, -16); ctx.lineTo(-28, 16);
            ctx.closePath(); ctx.fillStyle = '#05050a'; ctx.fill();
        }

        ctx.rotate(this.angle);

        ctx.fillStyle = '#777'; ctx.fillRect(10, -4, 15, 8);
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = skin.color; ctx.shadowColor = skin.color; ctx.shadowBlur = 10; ctx.fill();

        if (skin.heroType === 'capitan') {
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fillStyle = '#cc0024'; ctx.fill();
            ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = '#e2e8f0'; ctx.fill();
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fillStyle = '#0033cc'; ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(-2, -2, 4, 4);
        } else if (skin.heroType === 'flash') {
            ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fillStyle = '#8b0000'; ctx.fill();
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#ffe600';
            ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(4, -1); ctx.lineTo(1, 0); ctx.lineTo(5, 7); ctx.lineTo(-2, 1); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        } else if (skin.heroType === 'iron') {
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath();
            ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 8; ctx.fill();
        } else if (skin.heroType === 'bat') {
            ctx.fillStyle = '#ffe600'; ctx.fillRect(-6, -4, 12, 8);
            ctx.fillStyle = '#000'; ctx.fillRect(-4, -2, 8, 4);
        } else if (skin.heroType === 'thor') {
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.stroke();
        } else if (skin.heroType === 'hacker') {
            ctx.fillStyle = '#00ff66'; ctx.font = 'bold 12px monospace'; ctx.fillText('H', -4, 4);
        }

        ctx.fillStyle = skin.eyeColor; ctx.fillRect(6, -5, 5, 10);
        ctx.restore();

        if (this.activeBeam) {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.6)'; ctx.fillRect(15, -10, canvas.width, 20); ctx.restore();
        }
    }

    update() {
        let dx = 0, dy = 0;
        if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
        if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
        if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;

        if (touchMove.active) { dx = touchMove.x; dy = touchMove.y; }
        else if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

        let speedCap = this.speed;
        if (this.abilityTimer > 0 && currentUser.equippedSkin === 'flash') speedCap *= 1.35;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x + dx * speedCap));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y + dy * speedCap));

        if (this.isSpinning) {
            this.angle += 0.28;
            const available = getAvailableWeapons();
            const weapon = available[this.currentWeaponIndex] || available[0];
            bullets.push(new Bullet(this.x, this.y, this.angle, weapon));
        } else if (!touchMove.active) {
            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        }

        // --- DURAÇÃO E RECARGA DA SKIN (Q) ---
        if (this.abilityTimer > 0) {
            this.abilityTimer -= 1/60;
            if (this.abilityTimer <= 0) {
                this.isInvincible = false;
                this.isUnderground = false;
                this.activeBeam = false;
                this.abilityCooldown = this.pendingHeroCooldown; // RECARGA INICIA APENAS AGORA!
            }
        } else if (this.abilityCooldown > 0) {
            this.abilityCooldown -= 1/60;
        }

        // --- DURAÇÃO E RECARGA SLOT 1 (E) ---
        if (this.activeSkill1Timer > 0) {
            this.activeSkill1Timer -= 1/60;
            if (this.activeSkill1Timer <= 0) {
                if (activeSkillSlot1?.id === 'spin_shot') this.isSpinning = false;
                if (activeSkillSlot1?.id === 'confuse') this.isInvisibleConfuse = false;
                this.skill1Cooldown = 10; // RECARGA INICIA APENAS AGORA!
            }
        } else if (this.skill1Cooldown > 0) {
            this.skill1Cooldown -= 1/60;
        }

        // --- DURAÇÃO E RECARGA SLOT 2 (R) ---
        if (this.activeSkill2Timer > 0) {
            this.activeSkill2Timer -= 1/60;
            if (this.activeSkill2Timer <= 0) {
                if (activeSkillSlot2?.id === 'spin_shot') this.isSpinning = false;
                if (activeSkillSlot2?.id === 'confuse') this.isInvisibleConfuse = false;
                this.skill2Cooldown = 10; // RECARGA INICIA APENAS AGORA!
            }
        } else if (this.skill2Cooldown > 0) {
            this.skill2Cooldown -= 1/60;
        }

        if (this.isUnderground) {
            let pulled = 0;
            enemies.forEach(e => {
                if (pulled < 10) {
                    const angle = Math.atan2(this.y - e.y, this.x - e.x);
                    e.x += Math.cos(angle) * 5; e.y += Math.sin(angle) * 5; pulled++;
                    if (Math.hypot(this.x - e.x, this.y - e.y) < 25) e.health -= 2;
                }
            });
        }

        if (this.abilityTimer > 0 && currentUser.equippedSkin === 'thor') {
            enemies.forEach(e => {
                if (Math.hypot(this.x - e.x, this.y - e.y) < 140) {
                    e.health -= 1.5; particles.push(new Particle(e.x, e.y, '#60a5fa'));
                }
            });
        }

        if (this.activeBeam) {
            enemies.forEach(e => {
                const angleToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
                if (Math.abs(angleToEnemy - this.angle) < 0.25) e.health -= 3;
            });
        }
    }

    useHeroAbility(typeOverride = null) {
        if ((this.abilityCooldown > 0 || this.abilityTimer > 0) && !typeOverride) return;
        const skinType = typeOverride || currentUser.equippedSkin;

        if (skinType === 'capitan') { this.isInvincible = true; this.abilityTimer = 5; this.pendingHeroCooldown = 12; }
        else if (skinType === 'flash') { this.abilityTimer = 5; this.pendingHeroCooldown = 10; }
        else if (skinType === 'bat') { this.isUnderground = true; this.abilityTimer = 5; this.pendingHeroCooldown = 12; }
        else if (skinType === 'iron') { this.activeBeam = true; this.abilityTimer = 2.5; this.pendingHeroCooldown = 5; }
        else if (skinType === 'thor') { this.abilityTimer = 5; this.pendingHeroCooldown = 10; }
        updateUI();
    }

    useActiveSkill(slot) {
        const skill = slot === 1 ? activeSkillSlot1 : activeSkillSlot2;
        const currentCd = slot === 1 ? this.skill1Cooldown : this.skill2Cooldown;
        const currentTimer = slot === 1 ? this.activeSkill1Timer : this.activeSkill2Timer;

        if (!skill || currentCd > 0 || currentTimer > 0) return;

        if (skill.id === 'teleport') {
            this.x += Math.cos(this.angle) * 180;
            this.y += Math.sin(this.angle) * 180;
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
            for(let i=0; i<15; i++) particles.push(new Particle(this.x, this.y, '#00f0ff'));
            
            if (slot === 1) this.skill1Cooldown = 10;
            if (slot === 2) this.skill2Cooldown = 10;
        } else if (skill.id === 'bullet_bomb') {
            const available = getAvailableWeapons();
            const weapon = available[this.currentWeaponIndex] || available[0];
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
                bullets.push(new Bullet(this.x, this.y, a, weapon));
            }
            screenShake = 8;

            if (slot === 1) this.skill1Cooldown = 10;
            if (slot === 2) this.skill2Cooldown = 10;
        } else if (skill.id === 'spin_shot') {
            this.isSpinning = true;
            if (slot === 1) this.activeSkill1Timer = 5;
            if (slot === 2) this.activeSkill2Timer = 5;
        } else if (skill.id === 'confuse') {
            this.isInvisibleConfuse = true;
            if (slot === 1) this.activeSkill1Timer = 5;
            if (slot === 2) this.activeSkill2Timer = 5;
        }
        updateUI();
    }
}

class Bullet {
    constructor(x, y, angle, weapon) {
        this.x = x; this.y = y;
        this.speed = weapon.speed;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.color = weapon.color;
        this.damage = weapon.damage * damageMult;
        this.explosive = weapon.explosive || false;
        this.radius = weapon.explosive ? 6 : 4;
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.fill();
    }
    update() {
        this.x += this.vx; this.y += this.vy;
    }
}

class Enemy {
    constructor() {
        this.radius = Math.random() * 6 + 12;
        if (Math.random() < 0.5) {
            this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
            this.y = Math.random() * canvas.height;
        } else {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
        }

        const colorTierIndex = Math.min(ENEMY_COLOR_TIERS.length - 1, Math.floor(score / 500));
        this.color = ENEMY_COLOR_TIERS[colorTierIndex];

        this.speed = Math.random() * 1.3 + 1.1 + (colorTierIndex * 0.15);
        this.health = Math.floor((this.radius * 2) * enemyLevelMultiplier);
    }

    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 8; ctx.fill();

        if (player.isInvisibleConfuse) {
            ctx.fillStyle = '#ffe600'; ctx.font = 'bold 14px sans-serif';
            ctx.fillText('?', this.x - 3, this.y - this.radius - 5);
        }
    }

    update() {
        if (player.isInvisibleConfuse) {
            this.x += (Math.random() - 0.5) * this.speed;
            this.y += (Math.random() - 0.5) * this.speed;
            return;
        }

        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }
}

class Boss {
    constructor() {
        this.x = canvas.width / 2; this.y = -60; this.radius = 45;
        this.color = '#ff0055'; this.speed = 1.2;
        this.maxHealth = 1500 + (score * 0.5); this.health = this.maxHealth;
    }

    draw() {
        ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 25; ctx.fill();
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.restore();
    }

    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.radius = Math.random() * 3 + 1;
        this.vx = (Math.random() - 0.5) * 5; this.vy = (Math.random() - 0.5) * 5;
        this.alpha = 1;
    }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill(); ctx.restore();
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= 0.03; }
}

class FloatingText {
    constructor(txt, x, y, color) {
        this.txt = txt; this.x = x; this.y = y; this.color = color; this.alpha = 1;
    }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha;
        ctx.font = '10px monospace'; ctx.fillStyle = this.color;
        ctx.fillText(this.txt, this.x, this.y); ctx.restore();
    }
    update() { this.y -= 0.5; this.alpha -= 0.02; }
}

function getAvailableWeapons() {
    let list = [ALL_WEAPONS.pistol];
    currentUser.unlockedItems.forEach(id => { if (ALL_WEAPONS[id]) list.push(ALL_WEAPONS[id]); });
    return list;
}

function shoot() {
    if (!isPlaying || isPaused || isGameOver || player.isUnderground || player.isSpinning) return;
    const available = getAvailableWeapons();
    const weapon = available[player.currentWeaponIndex] || available[0];
    const now = Date.now();

    let rate = weapon.delay / fireRateMult;
    if (player.abilityTimer > 0 && currentUser.equippedSkin === 'flash') rate /= 3;

    if (now - lastShotTime < rate) return;
    if (weapon.ammo <= 0) return;

    if (weapon.ammo !== Infinity) weapon.ammo--;
    lastShotTime = now;
    screenShake = weapon.explosive ? 6 : 2;

    const totalCount = weapon.count + extraProjectiles;
    const baseSpread = weapon.spread > 0 ? weapon.spread : 0.12;

    for (let i = 0; i < totalCount; i++) {
        const spreadOffset = (i - (totalCount - 1) / 2) * baseSpread;
        bullets.push(new Bullet(player.x, player.y, player.angle + spreadOffset, weapon));
    }
    updateUI();
}

function checkScoreMilestones() {
    if (score >= nextBossScore && !activeBoss) {
        nextBossScore += 5000;
        activeBoss = new Boss();
        document.getElementById('boss-hud').classList.remove('hidden');
    }

    if (score >= currentScoreGoal) {
        currentScoreGoal += goalStep;
        goalStep += 50;
        enemyLevelMultiplier += 0.25;
        showUpgradeMenu();
    }
}

function showUpgradeMenu() {
    isPaused = true;
    const modal = document.getElementById('upgrade-modal');
    const container = document.getElementById('cards-container');
    
    let activeCount = (activeSkillSlot1 ? 1 : 0) + (activeSkillSlot2 ? 1 : 0);
    document.getElementById('passives-count-label').innerText = `Passivas: ${passiveCount}/10 | Ativas: ${activeCount}/2`;
    container.innerHTML = '';

    let pool = INGAME_UPGRADES.filter(u => {
        if (u.type === 'passive' && passiveCount >= 10 && u.id !== 'heal') return false;
        if (u.type === 'active' && activeCount >= 2) return false;
        if (u.type === 'active' && (activeSkillSlot1?.id === u.id || activeSkillSlot2?.id === u.id)) return false;
        return true;
    });

    const choices = pool.sort(() => 0.5 - Math.random()).slice(0, 3);

    choices.forEach(upg => {
        const card = document.createElement('div');
        card.className = `card ${upg.type === 'active' ? 'active-card' : ''}`;
        card.innerHTML = `
            <div style="font-size:1.5rem">${upg.icon}</div>
            <strong>${upg.name}</strong>
            <small style="font-size:0.7rem">${upg.desc}</small>
        `;
        card.onclick = () => {
            if (upg.type === 'passive') {
                if (upg.id === 'rapid') fireRateMult += 0.3;
                if (upg.id === 'damage') damageMult += 0.3;
                if (upg.id === 'speed') player.speed *= 1.2;
                if (upg.id === 'double') extraProjectiles += 1;
                if (upg.id === 'heal') player.health = Math.min(player.maxHealth, player.health + 50);
                if (upg.id !== 'heal') passiveCount++;
            } else if (upg.type === 'active') {
                if (!activeSkillSlot1) activeSkillSlot1 = upg;
                else if (!activeSkillSlot2) activeSkillSlot2 = upg;
            }

            modal.classList.add('hidden');
            isPaused = false;
            updateUI();
        };
        container.appendChild(card);
    });

    modal.classList.remove('hidden');
}

function startMatch() {
    document.getElementById('lobby-menu').classList.add('hidden');
    document.getElementById('ui').classList.remove('hidden');
    document.getElementById('boss-hud').classList.add('hidden');

    player = new Player();
    bullets = []; enemies = []; particles = []; floatTexts = []; activeBoss = null;
    score = 0; sessionCoins = 0;
    currentScoreGoal = 100; goalStep = 150; nextBossScore = 5000;
    enemyLevelMultiplier = 1;
    fireRateMult = 1; damageMult = 1; extraProjectiles = 0; passiveCount = 0;
    activeSkillSlot1 = null; activeSkillSlot2 = null;

    isPlaying = true; isPaused = false; isGameOver = false;
    updateUI();
}

function updateUI() {
    if (!currentUser) return;
    document.getElementById('lobby-coins').innerText = `${currentUser.coins} 🪙`;
    document.getElementById('game-coins').innerText = `${sessionCoins} 🪙`;
    document.getElementById('player-display-name').innerText = currentUser.username.toUpperCase();

    if (!isPlaying) return;

    const available = getAvailableWeapons();
    const weapon = available[player.currentWeaponIndex] || available[0];
    document.getElementById('health-fill').style.width = `${Math.max(0, (player.health / player.maxHealth) * 100)}%`;
    document.getElementById('score').innerText = score;
    document.getElementById('next-upg-display').innerText = `${currentScoreGoal} pts`;
    document.getElementById('weapon-name').innerText = weapon.name;
    document.getElementById('ammo-display').innerText = weapon.ammo === Infinity ? '∞' : weapon.ammo;

    // HUD DA SKIN (Q)
    let cdHero = 'PRONTO (Q)';
    if (currentUser.equippedSkin === 'hacker') {
        cdHero = '1-5 TECLAS';
    } else if (player.abilityTimer > 0) {
        cdHero = `ATIVO (${Math.ceil(player.abilityTimer)}s)`;
    } else if (player.abilityCooldown > 0) {
        cdHero = `${Math.ceil(player.abilityCooldown)}s`;
    }
    document.getElementById('hero-ability-display').innerText = cdHero;

    // HUD SLOT 1 (E)
    let cdActive1 = 'VAZIO';
    if (activeSkillSlot1) {
        if (player.activeSkill1Timer > 0) {
            cdActive1 = `ATIVO (${Math.ceil(player.activeSkill1Timer)}s)`;
        } else if (player.skill1Cooldown > 0) {
            cdActive1 = `${Math.ceil(player.skill1Cooldown)}s`;
        } else {
            cdActive1 = `${activeSkillSlot1.name} (E)`;
        }
    }
    document.getElementById('active-skill-1-display').innerText = cdActive1;

    // HUD SLOT 2 (R)
    let cdActive2 = 'VAZIO';
    if (activeSkillSlot2) {
        if (player.activeSkill2Timer > 0) {
            cdActive2 = `ATIVO (${Math.ceil(player.activeSkill2Timer)}s)`;
        } else if (player.skill2Cooldown > 0) {
            cdActive2 = `${Math.ceil(player.skill2Cooldown)}s`;
        } else {
            cdActive2 = `${activeSkillSlot2.name} (R)`;
        }
    }
    document.getElementById('active-skill-2-display').innerText = cdActive2;

    if (activeBoss) {
        document.getElementById('boss-health-fill').style.width = `${Math.max(0, (activeBoss.health / activeBoss.maxHealth) * 100)}%`;
    }
}

// LOOP PRINCIPAL
function gameLoop() {
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.8;
    }

    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

    if (isPlaying && !isPaused && !isGameOver) {
        player.update();
        player.draw();

        if (mouse.down) shoot();
        if (Math.random() < 0.03) enemies.push(new Enemy());

        if (activeBoss) {
            activeBoss.update();
            activeBoss.draw();

            if (!player.isInvincible && !player.isUnderground && Math.hypot(player.x - activeBoss.x, player.y - activeBoss.y) < player.radius + activeBoss.radius) {
                player.health -= 25; updateUI();
            }
        }

        bullets.forEach((bullet, bIndex) => {
            bullet.update(); bullet.draw();
            if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
                bullets.splice(bIndex, 1); return;
            }

            if (activeBoss && Math.hypot(bullet.x - activeBoss.x, bullet.y - activeBoss.y) < bullet.radius + activeBoss.radius) {
                activeBoss.health -= bullet.damage;
                bullets.splice(bIndex, 1); updateUI();

                if (activeBoss.health <= 0) {
                    activeBoss = null;
                    document.getElementById('boss-hud').classList.add('hidden');
                    score += 1000; sessionCoins += 500;
                    for(let i=0; i<40; i++) particles.push(new Particle(canvas.width/2, 100, '#ffd700'));
                    updateUI();
                }
            }
        });

        enemies.forEach((enemy, eIndex) => {
            enemy.update(); enemy.draw();

            if (!player.isInvincible && !player.isUnderground && Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius) {
                player.health -= 15;
                enemies.splice(eIndex, 1); updateUI();
                if (player.health <= 0) {
                    isGameOver = true;
                    currentUser.coins += sessionCoins;
                    if (score > currentUser.highScore) currentUser.highScore = score;
                    saveAccounts();
                    updateLeaderboard(currentUser.username, currentUser.highScore);

                    document.getElementById('final-score').innerText = score;
                    document.getElementById('earned-coins').innerText = `${sessionCoins} 🪙`;
                    document.getElementById('game-over').classList.remove('hidden');
                }
            }

            bullets.forEach((bullet, bIndex) => {
                if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < bullet.radius + enemy.radius) {
                    enemy.health -= bullet.damage;
                    bullets.splice(bIndex, 1);

                    if (enemy.health <= 0) {
                        enemies.splice(eIndex, 1);
                        score += 10; sessionCoins += 2;
                        updateUI(); checkScoreMilestones();
                    }
                }
            });
        });

        particles.forEach((p, idx) => { p.update(); p.draw(); if (p.alpha <= 0) particles.splice(idx, 1); });
        floatTexts.forEach((ft, idx) => { ft.update(); ft.draw(); if (ft.alpha <= 0) floatTexts.splice(idx, 1); });
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// EVENTOS DE TECLADO
window.addEventListener('keydown', e => {
    keys[e.key] = true;

    if (e.key === 'Tab') {
        e.preventDefault();
        switchWeapon();
    }

    if (e.key === 'e' || e.key === 'E') player.useActiveSkill(1);
    if (e.key === 'r' || e.key === 'R') player.useActiveSkill(2);

    if (e.key === 'q' || e.key === 'Q') {
        if (currentUser.equippedSkin !== 'hacker') player.useHeroAbility();
    }

    if (currentUser && currentUser.equippedSkin === 'hacker') {
        if (e.key === '1') player.useHeroAbility('capitan');
        if (e.key === '2') player.useHeroAbility('flash');
        if (e.key === '3') player.useHeroAbility('bat');
        if (e.key === '4') player.useHeroAbility('iron');
        if (e.key === '5') player.useHeroAbility('thor');
    }
});

window.addEventListener('keyup', e => keys[e.key] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

function switchWeapon() {
    if (!isPlaying) return;
    const available = getAvailableWeapons();
    player.currentWeaponIndex = (player.currentWeaponIndex + 1) % available.length;
    updateUI();
}

// CONTAS & LOJAS
document.getElementById('btn-register').onclick = () => {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value.trim();
    const msg = document.getElementById('auth-msg');

    if (!u || !p) { msg.innerText = 'Preencha usuário e senha!'; return; }
    if (accounts[u]) { msg.innerText = 'Este usuário já existe!'; return; }

    accounts[u] = { username: u, password: p, coins: 0, highScore: 0, equippedSkin: 'cyber', unlockedSkins: ['cyber'], unlockedItems: [] };
    saveAccounts();
    msg.style.color = '#00ff66'; msg.innerText = 'Conta criada com sucesso! Clique em ENTRAR.';
};

document.getElementById('btn-login').onclick = () => {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value.trim();
    const msg = document.getElementById('auth-msg');

    if (accounts[u] && accounts[u].password === p) {
        currentUser = accounts[u];
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('lobby-menu').classList.remove('hidden');
        updateUI();
    } else {
        msg.style.color = '#ff0055'; msg.innerText = 'Usuário ou senha incorretos!';
    }
};

document.getElementById('logout-btn').onclick = () => {
    currentUser = null;
    document.getElementById('lobby-menu').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
};

function renderSkinsShop() {
    const container = document.getElementById('skins-container');
    container.innerHTML = '';

    HERO_SKINS.forEach(skin => {
        const unlocked = currentUser.unlockedSkins.includes(skin.id);
        const equipped = currentUser.equippedSkin === skin.id;
        const card = document.createElement('div');
        card.className = `item-card ${equipped ? 'equipped' : ''} ${skin.id === 'hacker' ? 'hacker' : ''}`;
        card.innerHTML = `
            <span class="item-preview" style="background: ${skin.color}"></span>
            <strong>${skin.name}</strong>
            <small>${unlocked ? (equipped ? 'EQUIPADO' : 'USAR') : `${skin.price.toLocaleString()} 🪙`}</small>
        `;
        card.onclick = () => {
            if (unlocked) {
                currentUser.equippedSkin = skin.id;
            } else if (currentUser.coins >= skin.price) {
                currentUser.coins -= skin.price;
                currentUser.unlockedSkins.push(skin.id);
                currentUser.equippedSkin = skin.id;
            }
            saveAccounts(); updateUI(); renderSkinsShop();
        };
        container.appendChild(card);
    });
}

function renderItemsShop() {
    const container = document.getElementById('shop-container');
    container.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
        const unlocked = currentUser.unlockedItems.includes(item.id);
        const card = document.createElement('div');
        card.className = `item-card ${unlocked ? 'equipped' : ''}`;
        card.innerHTML = `
            <strong>${item.name}</strong>
            <small>${unlocked ? 'ADQUIRIDO' : `${item.price} 🪙`}</small>
        `;
        card.onclick = () => {
            if (!unlocked && currentUser.coins >= item.price) {
                currentUser.coins -= item.price;
                currentUser.unlockedItems.push(item.id);
                saveAccounts(); updateUI(); renderItemsShop();
            }
        };
        container.appendChild(card);
    });
}

function renderRankings() {
    const container = document.getElementById('rank-list');
    container.innerHTML = '';

    if (rankings.length === 0) { container.innerHTML = '<p>Nenhum recorde ainda!</p>'; return; }

    rankings.slice(0, 10).forEach((r, idx) => {
        const item = document.createElement('div');
        item.className = `rank-item ${idx === 0 ? 'top-1' : ''}`;
        item.innerHTML = `<span>#${idx + 1} <strong>${r.name.toUpperCase()}</strong></span><span style="color:#00f0ff">${r.score} pts</span>`;
        container.appendChild(item);
    });
}

document.getElementById('start-game-btn').onclick = startMatch;
document.getElementById('open-skins-btn').onclick = () => { renderSkinsShop(); document.getElementById('skins-modal').classList.remove('hidden'); };
document.getElementById('close-skins-btn').onclick = () => document.getElementById('skins-modal').classList.add('hidden');

document.getElementById('open-shop-btn').onclick = () => { renderItemsShop(); document.getElementById('shop-modal').classList.remove('hidden'); };
document.getElementById('close-shop-btn').onclick = () => document.getElementById('shop-modal').classList.add('hidden');

document.getElementById('open-info-btn').onclick = () => document.getElementById('info-modal').classList.remove('hidden');
document.getElementById('close-info-btn').onclick = () => document.getElementById('info-modal').classList.add('hidden');

document.getElementById('open-rank-btn').onclick = () => { renderRankings(); document.getElementById('rank-modal').classList.remove('hidden'); };
document.getElementById('close-rank-btn').onclick = () => document.getElementById('rank-modal').classList.add('hidden');

document.getElementById('lobby-return-btn').onclick = () => {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('lobby-menu').classList.remove('hidden');
    isPlaying = false; updateUI();
};

// Controles Mobile Touch
let touchMove = { active: false, x: 0, y: 0 };
const joyBase = document.getElementById('move-joystick');
const joyStick = document.getElementById('move-stick');

joyBase.addEventListener('touchstart', handleTouch);
joyBase.addEventListener('touchmove', handleTouch);
joyBase.addEventListener('touchend', () => {
    touchMove.active = false; joyStick.style.transform = `translate(0px, 0px)`;
});

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = joyBase.getBoundingClientRect();
    let dx = touch.clientX - (rect.left + rect.width / 2);
    let dy = touch.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > 28) { dx = (dx / dist) * 28; dy = (dy / dist) * 28; }

    joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
    touchMove.active = true; touchMove.x = dx / 28; touchMove.y = dy / 28;
    if (player) player.angle = Math.atan2(dy, dx);
}

document.getElementById('fire-btn').ontouchstart = (e) => { e.preventDefault(); mouse.down = true; };
document.getElementById('fire-btn').ontouchend = (e) => { e.preventDefault(); mouse.down = false; };
document.getElementById('ability-btn').ontouchstart = (e) => { e.preventDefault(); player.useHeroAbility(); };
document.getElementById('active-skill-1-btn').ontouchstart = (e) => { e.preventDefault(); player.useActiveSkill(1); };
document.getElementById('active-skill-2-btn').ontouchstart = (e) => { e.preventDefault(); player.useActiveSkill(2); };
document.getElementById('switch-btn').ontouchstart = (e) => { e.preventDefault(); switchWeapon(); };

gameLoop();