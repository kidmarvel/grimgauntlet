// ====== CORE GAME CONSTANTS =======
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const SAVE_KEY = "grimoire_gauntlet_save_v2";

// ====== GAME STATE =======
const game = {
  running: false,
  paused: false,
  mouseX: 400,
  mouseY: 300,
  wave: 1,
  zoneIndex: 0,
  zones: [
    { 
      name: "Forest of Beginnings", 
      background: "url('assets/background/forest_bg.jpg')",
      music: "sounds/forest_theme.mp3"
    },
    { 
      name: "Ice Caverns", 
      background: "url('assets/background/ice_cave_bg.jpg')",
      music: "sounds/ice_theme.mp3"
    },
    { 
      name: "Volcanic Depths", 
      background: "url('assets/background/volcano_bg.jpg')",
      music: "sounds/lava_theme.mp3"
    }
  ],
  particles: [],
  lastTime: 0
};

// ====== SETTINGS =======
const settings = {
  sfxEnabled: true,
  musicEnabled: true,
  load: function() {
    const saved = localStorage.getItem('gg_settings');
    if (saved) {
      const data = JSON.parse(saved);
      this.sfxEnabled = data.sfxEnabled;
      this.musicEnabled = data.musicEnabled;
    }
  },
  save: function() {
    localStorage.setItem('gg_settings', JSON.stringify({
      sfxEnabled: this.sfxEnabled,
      musicEnabled: this.musicEnabled
    }));
  }
};

// ====== AUDIO SYSTEM =======
const audio = {
  mainTheme: document.getElementById("mainTheme"),
  sfx: {
    fire: new Audio('sounds/fire_cast.wav'),
    ice: new Audio('sounds/ice_cast.wav'),
    heal: new Audio('sounds/heal_cast.wav'),
    thunder: new Audio('sounds/thunder_cast.wav'),
    levelUp: new Audio('sounds/level_up.wav'),
    enemyHit: new Audio('sounds/enemy_hit.wav'),
    playerHit: new Audio('sounds/player_hit.wav')
  },
  playSfx: function(name) {
    if (!settings.sfxEnabled) return;
    try {
      this.sfx[name].currentTime = 0;
      this.sfx[name].play();
    } catch (e) {
      console.warn("SFX error:", e);
    }
  },
  setMusic: function(enabled) {
    settings.musicEnabled = enabled;
    if (enabled) {
      this.mainTheme.play().catch(e => console.warn("Music error:", e));
    } else {
      this.mainTheme.pause();
    }
    settings.save();
  }
};

// ====== PLAYER =======
const player = {
  x: 400,
  y: 500,
  size: 20,
  color: "#f6ff00",
  gridSize: 40,
  speed: 5,
  maxHp: 3,
  hp: 3,
  xp: 0,
  level: 1,
  xpToNext: 10,
  spellsUnlocked: [0, 1, 2, 3], // Start with first two spells
  skillPoints: 0,
  damageBonus: 0,
  lastDamaged: 0,
  invulnerable: false
};

// ====== SPELL SYSTEM =======
const allSpells = [
  { 
    id: 0,
    name: "Firebolt", 
    color: "#ff4422", 
    cooldown: 1000, 
    baseDamage: 1, 
    description: "Basic fire projectile",
    unlockLevel: 1,
    sfx: "fire",
    cast: function() {
      const target = enemies[currentTarget];
      if (!target) return;
      
      projectiles.push({
        x: player.x,
        y: player.y,
        tx: target.x,
        ty: target.y,
        color: this.color,
        damage: this.baseDamage + player.damageBonus,
        targetId: target.id,
        type: this.name,
        speed: 0.15,
        size: 8
      });
    }
  },
  { 
    id: 1,
    name: "Frost Ray", 
    color: "#66ccff", 
    cooldown: 1500, 
    baseDamage: 1, 
    description: "Slows enemies on hit",
    unlockLevel: 1,
    sfx: "ice",
    cast: function() {
      const target = enemies[currentTarget];
      if (!target) return;
      
      projectiles.push({
        x: player.x,
        y: player.y,
        tx: target.x,
        ty: target.y,
        color: this.color,
        damage: this.baseDamage + player.damageBonus,
        targetId: target.id,
        type: this.name,
        speed: 0.12,
        size: 6,
        effect: "slow"
      });
    }
  },
  { 
    id: 2,
    name: "Plasma Orb", 
    color: "#cc66ff", 
    cooldown: 2000, 
    baseDamage: 2, 
    description: "Powerful arcane energy",
    unlockLevel: 3,
    sfx: "thunder", // Temporary
    cast: function() {
      const target = enemies[currentTarget];
      if (!target) return;
      
      projectiles.push({
        x: player.x,
        y: player.y,
        tx: target.x,
        ty: target.y,
        color: this.color,
        damage: this.baseDamage + player.damageBonus,
        targetId: target.id,
        type: this.name,
        speed: 0.1,
        size: 12,
        effect: "splash"
      });
    }
  },
  { 
    id: 3,
    name: "Healing Light", 
    color: "#aaffaa", 
    cooldown: 3000, 
    baseDamage: -2, 
    description: "Restores your health",
    unlockLevel: 5,
    sfx: "heal",
    cast: function() {
      // Healing doesn't need a target
      applyDamage(player, this.baseDamage, this.name);
      createParticles(player.x, player.y, this.color, 15, 4, 1, 30);
    }
  }
];

let spells = []; // Active spells
let projectiles = [];
let enemies = [];
let currentTarget = 0;

// ====== PARTICLE SYSTEM =======
function createParticles(x, y, color, count, size, speed, life) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * speed;
    
    game.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      color: color,
      size: Math.random() * size + 2,
      life: life,
      maxLife: life
    });
  }
}

function updateParticles(deltaTime) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= deltaTime / 16;
    
    if (p.life <= 0) {
      game.particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  game.particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ====== ENEMY SYSTEM =======
const enemyTypes = {
  goblin: {
    name: "Goblin",
    color: "#00fc08",
    speed: 1.2,
    health: 3,
    attack: 1,
    xp: 2,
    size: 20,
    behavior: "melee"
  },
  brute: {
    name: "Goblin Brute",
    color: "#000087",
    speed: 0.8,
    health: 6,
    attack: 2,
    xp: 4,
    size: 25,
    behavior: "melee"
  },
  archer: {
    name: "Goblin Archer",
    color: "#fc3b00",
    speed: 1.5,
    health: 2,
    attack: 1,
    xp: 3,
    size: 18,
    behavior: "ranged",
    attackRange: 200,
    projectileSpeed: 5,
    attackCooldown: 100
  },
  shaman: {
    name: "Goblin Shaman",
    color: "#00bbff",
    speed: 1.0,
    health: 4,
    attack: 1,
    xp: 5,
    size: 22,
    behavior: "ranged",
    attackRange: 250,
    projectileSpeed: 4,
    attackCooldown: 120,
    special: "heal"
  },
  boss: {
    name: "Goblin King",
    color: "#D32F2F",
    speed: 0.7,
    health: 30,
    attack: 3,
    xp: 20,
    size: 40,
    behavior: "ranged",
    attackRange: 500,
    projectileSpeed: 1,
    attackCooldown: 1500,
    special: "summon"
  }
};

// ====== WAVE SYSTEM =======
function spawnWave(waveNum) {
  enemies = [];
  const isBossWave = waveNum % 5 === 0;
  let enemyCount = isBossWave ? 1 : 3 + Math.floor(waveNum * 1.5);
  
  // Determine enemy types based on wave number
  const availableTypes = [];
  if (waveNum >= 1) availableTypes.push("goblin");
  if (waveNum >= 2) availableTypes.push("brute");
  if (waveNum >= 3) availableTypes.push("archer");
  if (waveNum >= 4) availableTypes.push("shaman");
  
  for (let i = 0; i < enemyCount; i++) {
    let type;
    if (isBossWave) {
      type = "boss";
    } else {
      // Weighted random selection
      const weights = [
        { type: "goblin", weight: 50 },
        { type: "brute", weight: 30 },
        { type: "archer", weight: 15 },
        { type: "shaman", weight: 5 }
      ];
      
      let totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      let random = Math.random() * totalWeight;
      let weightSum = 0;
      
      for (const w of weights) {
        weightSum += w.weight;
        if (random <= weightSum) {
          type = w.type;
          break;
        }
      }
    }
    
    const base = enemyTypes[type];
    const healthMultiplier = 1 + (waveNum * 0.1);
    const xpMultiplier = 1 + (waveNum * 0.05);
    
    enemies.push({
      id: i,
      type: type,
      name: base.name,
      x: 100 + (i % 5) * 150,
      y: 100 + Math.floor(i / 5) * 100,
      maxHp: Math.floor(base.health * healthMultiplier),
      hp: Math.floor(base.health * healthMultiplier),
      color: base.color,
      speed: base.speed,
      size: base.size,
      behavior: base.behavior,
      attack: base.attack,
      attackRange: base.attackRange || 0,
      projectileSpeed: base.projectileSpeed || 0,
      attackCooldown: base.attackCooldown || 60,
      currentCooldown: 0,
      xpValue: Math.floor(base.xp * xpMultiplier),
      slowTimer: 0,
      hitTimer: 0,
      special: base.special
    });
  }
  
  waveInProgress = true;
  document.getElementById("waveMessage").style.display = "none";
  log(`Wave ${waveNum} started! ${enemyCount} ${isBossWave ? "boss" : "enemies"} approaching!`);
}

// ====== GAME INITIALIZATION =======
function initMenu() {
  settings.load();
  
  document.getElementById("fightBtn").onclick = () => startGame("new");
  document.getElementById("loadBtn").onclick = loadGame;
  document.getElementById("howToPlayBtn").onclick = showHowToPlay;
  
  document.getElementById("audioToggle").onclick = () => {
    audio.setMusic(!settings.musicEnabled);
    document.getElementById("audioToggle").textContent = settings.musicEnabled ? "🔊" : "🔇";
  };
  
  document.getElementById("sfxToggle").onclick = () => {
    settings.sfxEnabled = !settings.sfxEnabled;
    document.getElementById("sfxToggle").textContent = settings.sfxEnabled ? "🔊" : "🔇";
    settings.save();
  };
  
  document.getElementById("audioToggle").textContent = settings.musicEnabled ? "🔊" : "🔇";
  document.getElementById("sfxToggle").textContent = settings.sfxEnabled ? "🔊" : "🔇";
  
  // Try to play music if enabled
  if (settings.musicEnabled) {
    audio.mainTheme.volume = 0.3;
    audio.mainTheme.play().catch(e => console.warn("Music autoplay blocked:", e));
  }
}

function startGame(mode) {
  if (mode === "new") {
    // Reset player progress
    player.xp = 0;
    player.level = 1;
    player.xpToNext = calcXpToNext(1);
    player.skillPoints = 0;
    player.spellsUnlocked = [0, 1];
    player.damageBonus = 0;
    player.maxHp = 3;
    player.hp = player.maxHp;
    game.wave = 1;
    game.zoneIndex = 0;
  }
  
  // Setup game screen
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameScreen").style.display = "block";
  
  // Initialize spells
  spells = player.spellsUnlocked.map(id => {
    const base = allSpells.find(s => s.id === id);
    return {
      ...base,
      ready: true,
      cooldownTimer: 0
    };
  });
  
  // Set background and music
  updateArenaBackground();
  
  // Start with first wave
  currentTarget = 0;
  spawnWave(game.wave);
  
  // Setup controls
  initInput();
  renderHotkeys();
  updateUI();
  
  // Start game loop
  game.running = true;
  game.paused = false;
  game.lastTime = 0;
  requestAnimationFrame(gameLoop);
}

// ====== GAME LOOP =======
function gameLoop(timestamp) {
  const deltaTime = timestamp - game.lastTime;
  game.lastTime = timestamp;
  
  if (!game.paused && game.running) {
    // Update game state
    updatePlayer(deltaTime);
    updateEnemies(deltaTime);
    updateProjectiles(deltaTime);
    updateParticles(deltaTime);
    updateCooldowns(deltaTime);
    
    // Check for level up
    if (player.skillPoints > 0 && !document.getElementById("skillTreeModal").style.display === "flex") {
      showSkillTree();
    }
  }
  
  // Always render (even when paused)
  render();
  
  requestAnimationFrame(gameLoop);
}

function updatePlayer(deltaTime) {
  // Handle invulnerability frames
  if (player.invulnerable) {
    player.lastDamaged += deltaTime;
    if (player.lastDamaged >= 1000) { // 1 second invulnerability
      player.invulnerable = false;
    }
  }
  
  // Movement
  const targetX = Math.round(game.mouseX / player.gridSize) * player.gridSize;
  const targetY = Math.round(game.mouseY / player.gridSize) * player.gridSize;
  
  if (Math.abs(player.x - targetX) > player.speed) {
    player.x += (targetX > player.x ? player.speed : -player.speed);
  }
  
  if (Math.abs(player.y - targetY) > player.speed) {
    player.y += (targetY > player.y ? player.speed : -player.speed);
  }
  
  // Boundary check
  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function updateEnemies(deltaTime) {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    
    // Handle slow effect
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= deltaTime;
      enemy.currentSpeed = enemy.speed * 0.5;
    } else {
      enemy.currentSpeed = enemy.speed;
    }
    
    // Handle attack cooldown
    if (enemy.currentCooldown > 0) {
      enemy.currentCooldown -= deltaTime;
    }
    
    // Behavior
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (enemy.behavior === "melee") {
      // Melee enemies chase and attack
      if (dist > 30) {
        enemy.x += (dx / dist) * enemy.currentSpeed * (deltaTime / 16);
        enemy.y += (dy / dist) * enemy.currentSpeed * (deltaTime / 16);
      } else if (enemy.currentCooldown <= 0) {
        // Attack player
        enemy.currentCooldown = enemy.attackCooldown;
        damagePlayer(enemy.attack);
      }
    } else if (enemy.behavior === "ranged" && dist <= enemy.attackRange) {
      // Ranged enemies keep distance and shoot
      if (dist < enemy.attackRange * 0.8) {
        // Move away if too close
        enemy.x -= (dx / dist) * enemy.currentSpeed * 0.5 * (deltaTime / 16);
        enemy.y -= (dy / dist) * enemy.currentSpeed * 0.5 * (deltaTime / 16);
      }
      
      if (enemy.currentCooldown <= 0) {
        // Shoot projectile
        enemy.currentCooldown = enemy.attackCooldown;
        const angle = Math.atan2(dy, dx);
        
        projectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * enemy.projectileSpeed,
          vy: Math.sin(angle) * enemy.projectileSpeed,
          color: enemy.color,
          damage: enemy.attack,
          isEnemy: true,
          size: 6
        });
      }
    }
    
    // Special abilities
    if (enemy.special === "heal" && enemy.currentCooldown <= 0) {
      // Find nearby allies to heal
      for (const other of enemies) {
        if (other !== enemy && other.hp < other.maxHp * 0.5) {
          const distToAlly = Math.sqrt(
            Math.pow(other.x - enemy.x, 2) + 
            Math.pow(other.y - enemy.y, 2)
          );
          
          if (distToAlly < 150) {
            other.hp = Math.min(other.maxHp, other.hp + 2);
            createParticles(other.x, other.y, "#aaffaa", 10, 4, 1, 30);
            log(`${enemy.name} healed ${other.name}!`);
            enemy.currentCooldown = enemy.attackCooldown * 2;
            break;
          }
        }
      }
    }
    
    // Update hit timer
    if (enemy.hitTimer > 0) {
      enemy.hitTimer -= deltaTime;
    }
  }
}

function updateProjectiles(deltaTime) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    
    if (p.isEnemy) {
      // Enemy projectiles move straight
      p.x += p.vx * (deltaTime / 16);
      p.y += p.vy * (deltaTime / 16);
      
      // Check collision with player
      const distToPlayer = Math.sqrt(
        Math.pow(p.x - player.x, 2) + 
        Math.pow(p.y - player.y, 2)
      );
      
      if (distToPlayer < player.size + p.size) {
        damagePlayer(p.damage);
        createParticles(p.x, p.y, p.color, 10, 4, 1, 30);
        projectiles.splice(i, 1);
        continue;
      }
    } else {
      // Player projectiles home in on target
      const target = enemies.find(e => e.id === p.targetId);
      if (!target) {
        projectiles.splice(i, 1);
        continue;
      }
      
      p.x += (target.x - p.x) * p.speed * (deltaTime / 16);
      p.y += (target.y - p.y) * p.speed * (deltaTime / 16);
      
      // Check collision with target
      const distToTarget = Math.sqrt(
        Math.pow(p.x - target.x, 2) + 
        Math.pow(p.y - target.y, 2)
      );
      
      if (distToTarget < target.size + p.size) {
        applyDamage(target, p.damage, p.type);
        createParticles(p.x, p.y, p.color, 15, p.size, 1, 30);
        
        // Splash damage effect
        if (p.effect === "splash") {
          for (const e of enemies) {
            if (e !== target) {
              const dist = Math.sqrt(
                Math.pow(e.x - target.x, 2) + 
                Math.pow(e.y - target.y, 2)
              );
              
              if (dist < 60) { // Splash radius
                applyDamage(e, p.damage * 0.5, p.type + " (splash)");
              }
            }
          }
        }
        
        projectiles.splice(i, 1);
      }
    }
    
    // Remove projectiles that go off-screen
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      projectiles.splice(i, 1);
    }
  }
}

function updateCooldowns(deltaTime) {
  spells.forEach(spell => {
    if (!spell.ready) {
      spell.cooldownTimer -= deltaTime;
      if (spell.cooldownTimer <= 0) {
        spell.ready = true;
        spell.cooldownTimer = 0;
        renderHotkeys();
      }
    }
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  drawGrid();
  
  // Draw all game objects
  drawParticles();
  drawProjectiles();
  drawEnemies();
  drawPlayer();
  
  // Apply screen shake if active
  applyScreenShake();
}

function drawGrid() {
  ctx.strokeStyle = "#333344";
  ctx.lineWidth = 1;
  
  for (let x = 0; x < canvas.width; x += player.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  for (let y = 0; y < canvas.height; y += player.gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  // Draw player with invulnerability flash
  if (!player.invulnerable || Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEnemies() {
  enemies.forEach((enemy, idx) => {
    // Draw enemy body
    const isCurrentTarget = enemy.id === enemies[currentTarget]?.id;
    const hitFlash = enemy.hitTimer > 0 ? 0.7 : 1.0;
    
    ctx.fillStyle = isCurrentTarget ? "#ffcc00" : enemy.color;
    ctx.globalAlpha = hitFlash;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    
    // Draw outline
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw health bar
    const healthRatio = enemy.hp / enemy.maxHp;
    const barWidth = enemy.size * 2;
    const barHeight = 5;
    
    ctx.fillStyle = "#333";
    ctx.fillRect(
      enemy.x - barWidth / 2,
      enemy.y - enemy.size - 10,
      barWidth,
      barHeight
    );
    
    ctx.fillStyle = healthRatio > 0.6 ? "#4CAF50" : 
                   healthRatio > 0.3 ? "#FFC107" : "#F44336";
    ctx.fillRect(
      enemy.x - barWidth / 2,
      enemy.y - enemy.size - 10,
      barWidth * healthRatio,
      barHeight
    );
  });
}

function drawProjectiles() {
  projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add glow effect for player projectiles
    if (!p.isEnemy) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
}

// ====== GAME MECHANICS =======
function damagePlayer(amount) {
  if (player.invulnerable) return;
  
  player.hp -= amount;
  player.lastDamaged = 0;
  player.invulnerable = true;
  audio.playSfx("playerHit");
  createParticles(player.x, player.y, "#ff4422", 15, 4, 1, 30);
  shakeScreen();
  
  log(`You took ${amount} damage! HP: ${player.hp}/${player.maxHp}`);
  updateUI();
  
  if (player.hp <= 0) {
    gameOver();
  }
}

function applyDamage(target, amount, spellType) {
  if (amount < 0) {
    // Healing effect
    player.hp = Math.min(player.maxHp, player.hp - amount);
    audio.playSfx("heal");
    log(`Healed ${-amount} HP! (${player.hp}/${player.maxHp})`);
    updateUI();
    return;
  }
  
  target.hp -= amount;
  target.hitTimer = 10; // Flash when hit
  audio.playSfx("enemyHit");
  shakeScreen();
  
  // Apply spell effects
  if (spellType === "Frost Ray") {
    target.slowTimer = 2000; // 2 seconds slow
  }
  
  log(`Hit ${target.name} with ${spellType} for ${amount} damage!`);
  
  if (target.hp <= 0) {
    giveXP(target.xpValue);
    enemies = enemies.filter(e => e.id !== target.id);
    
    // Switch target if current target died
    if (currentTarget >= enemies.length) {
      currentTarget = Math.max(0, enemies.length - 1);
    }
    
    if (enemies.length === 0) {
      waveComplete();
    }
  }
}

function giveXP(amount) {
  player.xp += amount;
  log(`Gained ${amount} XP! (${player.xp}/${player.xpToNext})`);
  
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.skillPoints++;
    player.xpToNext = calcXpToNext(player.level);
    player.maxHp++;
    player.hp = player.maxHp;
    
    audio.playSfx("levelUp");
    log(`Level up! Now level ${player.level}. ${player.skillPoints} skill points available!`);
  }
  
  updateUI();
}

function calcXpToNext(level) {
  return 10 + level * 5;
}

function waveComplete() {
  waveInProgress = false;
  game.wave++;
  saveGame();
  
  const waveMsg = document.getElementById("waveMessage");
  waveMsg.textContent = `Wave ${game.wave - 1} Complete!`;
  waveMsg.style.display = "block";
  
  setTimeout(() => {
    waveMsg.style.display = "none";
    spawnWave(game.wave);
  }, 3000);
}

function gameOver() {
  game.running = false;
  log("You have been defeated!");
  
  setTimeout(() => {
    if (confirm("Game Over! Would you like to try again?")) {
      startGame("new");
    } else {
      document.getElementById("gameScreen").style.display = "none";
      document.getElementById("mainMenu").style.display = "flex";
    }
  }, 1000);
}

// ====== SCREEN SHAKE =======
let shakeTimer = 0;
let shakeIntensity = 0;

function shakeScreen(intensity = 5) {
  shakeTimer = 10;
  shakeIntensity = intensity;
}

function applyScreenShake() {
  if (shakeTimer > 0) {
    shakeTimer--;
    const dx = (Math.random() - 0.5) * shakeIntensity;
    const dy = (Math.random() - 0.5) * shakeIntensity;
    canvas.style.transform = `translate(${dx}px, ${dy}px)`;
  } else {
    canvas.style.transform = "";
  }
}

// ====== UI FUNCTIONS =======
function updateUI() {
  document.getElementById("playerHealth").textContent = `HP: ${player.hp} / ${player.maxHp}`;
  document.getElementById("playerXP").textContent = `XP: ${player.xp} / ${player.xpToNext} | Level: ${player.level}`;
  document.getElementById("skillPoints").textContent = `Skill Points: ${player.skillPoints}`;
  document.getElementById("zoneName").textContent = `Zone: ${game.zones[game.zoneIndex].name}`;
}

function renderHotkeys() {
  const container = document.getElementById("spellHotkeys");
  container.innerHTML = spells
    .map((spell, i) => `
      <div class="spell-slot" data-key="${i + 1}">
        <span class="key">${i + 1}</span>
        <span class="name">${spell.name}</span>
        ${!spell.ready ? `
          <div class="cooldown-overlay" 
               style="animation-duration:${spell.cooldown}ms;
                      height:${(spell.cooldownTimer / spell.cooldown) * 100}%">
          </div>` : ''}
      </div>
    `)
    .join("");
  
  // Add click handlers
  document.querySelectorAll(".spell-slot").forEach((slot, i) => {
    slot.onclick = () => {
      if (spells[i].ready) {
        castSpell(spells[i]);
      }
    };
  });
}

function log(message) {
  const el = document.getElementById("battleLog");
  el.innerHTML += `<div>${message}</div>`;
  el.scrollTop = el.scrollHeight;
}

// ====== SPELL CASTING =======
function castSpell(spell) {
  if (!spell.ready || !game.running || game.paused) return;
  
  spell.ready = false;
  spell.cooldownTimer = spell.cooldown;
  audio.playSfx(spell.sfx);
  
  // Call the spell's cast function
  spell.cast();
  
  renderHotkeys();
}

// ====== SKILL TREE =======
function showSkillTree() {
  if (player.skillPoints < 1) return;
  
  const modal = document.getElementById("skillTreeModal");
  const container = document.getElementById("spellOptions");
  container.innerHTML = '';
  
  // Get spells that can be unlocked
  const availableSpells = allSpells.filter(spell => 
    !player.spellsUnlocked.includes(spell.id) && 
    spell.unlockLevel <= player.level
  );
  
  if (availableSpells.length === 0) {
    container.innerHTML = "<p>No new spells available to unlock yet!</p>";
  } else {
    availableSpells.forEach(spell => {
      const option = document.createElement("div");
      option.className = "spell-option";
      option.innerHTML = `
        <h3>${spell.name}</h3>
        <p>${spell.description}</p>
        <p>Damage: ${spell.baseDamage}</p>
        <p>Cooldown: ${spell.cooldown/1000}s</p>
      `;
      option.onclick = () => unlockSpell(spell.id);
      container.appendChild(option);
    });
  }
  
  modal.style.display = "flex";
}

function unlockSpell(spellId) {
  if (player.skillPoints < 1) return;
  
  player.spellsUnlocked.push(spellId);
  player.skillPoints--;
  
  // Add to active spells
  const baseSpell = allSpells.find(s => s.id === spellId);
  spells.push({
    ...baseSpell,
    ready: true,
    cooldownTimer: 0
  });
  
  document.getElementById("skillTreeModal").style.display = "none";
  log(`Unlocked new spell: ${baseSpell.name}!`);
  renderHotkeys();
  updateUI();
}

// ====== HOW TO PLAY =======
function showHowToPlay() {
  document.getElementById("howToPlayModal").style.display = "flex";
}

// ====== SAVE/LOAD =======
function saveGame() {
  const data = {
    version: 2,
    player: {
      hp: player.hp,
      maxHp: player.maxHp,
      xp: player.xp,
      level: player.level,
      xpToNext: player.xpToNext,
      skillPoints: player.skillPoints,
      spellsUnlocked: player.spellsUnlocked,
      damageBonus: player.damageBonus
    },
    game: {
      wave: game.wave,
      zoneIndex: game.zoneIndex
    },
    settings: {
      sfxEnabled: settings.sfxEnabled,
      musicEnabled: settings.musicEnabled
    }
  };
  
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  log("Game saved.");
}

function loadGame() {
  const saveData = localStorage.getItem(SAVE_KEY);
  if (!saveData) {
    alert("No saved game found!");
    return;
  }
  
  try {
    const data = JSON.parse(saveData);
    
    // Load player data
    Object.assign(player, data.player);
    
    // Load game state
    game.wave = data.game.wave;
    game.zoneIndex = data.game.zoneIndex;
    
    // Load settings
    if (data.settings) {
      settings.sfxEnabled = data.settings.sfxEnabled;
      settings.musicEnabled = data.settings.musicEnabled;
    }
    
    // Initialize spells
    spells = player.spellsUnlocked.map(id => {
      const base = allSpells.find(s => s.id === id);
      return {
        ...base,
        ready: true,
        cooldownTimer: 0
      };
    });
    
    // Start game
    startGame("load");
    
  } catch (e) {
    console.error("Failed to load save:", e);
    alert("Failed to load saved game. Starting new game.");
    startGame("new");
  }
}

// ====== INPUT HANDLING =======
function initInput() {
  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.key >= "1" && e.key <= "9") {
      const index = parseInt(e.key) - 1;
      if (spells[index] && spells[index].ready) {
        castSpell(spells[index]);
      }
    }
    
    // Pause game
    if (e.key === "Escape") {
      togglePause();
    }
  });
  
  // Mouse movement
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.mouseX = e.clientX - rect.left;
    game.mouseY = e.clientY - rect.top;
  });
  
  // Right-click to switch targets
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (enemies.length > 0) {
      currentTarget = (currentTarget + 1) % enemies.length;
      log(`Target switched to ${enemies[currentTarget].name}`);
    }
  });
  
  // Pause button
  document.getElementById("pauseBtn").onclick = togglePause;
  
  // Close modals
  document.getElementById("closeSkillTree").onclick = () => {
    document.getElementById("skillTreeModal").style.display = "none";
  };
  
  document.getElementById("closeHowToPlay").onclick = () => {
    document.getElementById("howToPlayModal").style.display = "none";
  };
}

function togglePause() {
  if (!game.running) return;
  
  game.paused = !game.paused;
  document.getElementById("pauseBtn").textContent = game.paused ? "▶" : "⏸";
  
  if (game.paused) {
    audio.mainTheme.pause();
  } else if (settings.musicEnabled) {
    audio.mainTheme.play().catch(e => console.warn("Music error:", e));
  }
}

// ====== UTILITY FUNCTIONS =======
function updateArenaBackground() {
  const arena = document.getElementById("arenaBackground");
  const zone = game.zones[game.zoneIndex];
  
  if (zone) {
    arena.style.backgroundImage = zone.background;
    document.getElementById("zoneName").textContent = `Zone: ${zone.name}`;
    
    // Change music if available
    if (zone.music) {
      audio.mainTheme.src = zone.music;
      if (settings.musicEnabled) {
        audio.mainTheme.play().catch(e => console.warn("Music error:", e));
      }
    }
  }
}

// Initialize the game when loaded
window.onload = initMenu;
