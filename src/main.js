import Phaser from 'phaser';
import './styles.css';

const touchHeld = new Set();
const touchPressed = new Set();
const justPressed = (action) => touchPressed.delete(action);
const keyActions = { Enter: 'start', KeyR: 'restart', KeyM: 'map', KeyP: 'pause', Escape: 'pause', Space: 'jump', KeyF: 'shoot', KeyJ: 'shoot' };
// Queue brief key taps so they survive until the next render frame, just like touch taps.
window.addEventListener('keydown', event => {
  const action = keyActions[event.code];
  if (action && !event.repeat) touchPressed.add(action);
});
const clearTouch = () => { touchHeld.clear(); touchPressed.clear(); };
for (const button of document.querySelectorAll('#touch-controls button')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (button.dataset.hold) touchHeld.add(button.dataset.hold);
    else touchPressed.add(button.dataset.action);
  });
  const release = () => { if (button.dataset.hold) touchHeld.delete(button.dataset.hold); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}
window.addEventListener('blur', clearTouch);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearTouch(); });

function prepareSpriteFrames(scene) {
  const frames = {
    'player-idle':[45,255,125,175], 'player-jump':[1040,25,155,190], 'player-fall':[1240,45,165,195],
    'fruit-star-clean':[1020,270,155,150], 'fruit-star-padded':[1020,270,155,150],
    'shell-spike':[1230,270,190,150], 'spring':[700,465,180,180],
  };
  for(let i=0;i<6;i++) frames['player-run-'+i]=[40+i*160,35,140,195];
  for(const [key,crop] of Object.entries(frames)) {
    const player=key.startsWith('player'),w=player?144:192,h=player?208:192;
    if(scene.textures.exists(key)) scene.textures.remove(key);
    const texture=scene.textures.createCanvas(key,w,h),context=texture.context;
    const sample=document.createElement('canvas');sample.width=crop[2];sample.height=crop[3];
    const ctx=sample.getContext('2d');ctx.drawImage(scene.textures.get('source-summer').getSourceImage(),...crop,0,0,crop[2],crop[3]);
    const pixels=ctx.getImageData(0,0,crop[2],crop[3]).data;let left=crop[2],top=crop[3],right=0,bottom=0;
    for(let y=0;y<crop[3];y++)for(let x=0;x<crop[2];x++)if(pixels[(y*crop[2]+x)*4+3]>8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    const sw=right-left+1,sh=bottom-top+1,scale=player ? 0.92 : Math.min((w-16)/sw,(h-16)/sh);
    context.imageSmoothingEnabled=false;
    context.drawImage(sample,left,top,sw,sh,(w-sw*scale)/2,h-8-sh*scale,sw*scale,sh*scale);
    texture.refresh();
  }
  const crop=[880,65,140,125];
  if(scene.textures.exists('power-heart')) scene.textures.remove('power-heart');
  const texture=scene.textures.createCanvas('power-heart',160,160);
  texture.context.drawImage(scene.textures.get('source-upgrades').getSourceImage(),...crop,10,15,140,125);texture.refresh();
  scene.registry.set('padded-frames',true);
}


const WORLD = {
  width: 5200,
  height: 720,
  groundY: 640,
};

const PLAYER = {
  bodyWidth: 38,
  bodyHeight: 76,
  walkSpeed: 170,
  runSpeed: 270,
  jumpVelocity: -430,
  gravityY: 980,
  airControl: 0.82,
  maxJumps: 2,
  coyoteTimeMs: 95,
  jumpBufferMs: 120,
  invulnerableMs: 900,
  maxLives: 3,
};

const COLORS = {
  skyTop: 0x65d7ff,
  skyBottom: 0xffe2a1,
  ocean: 0x37b8d6,
  grass: 0x4fc45a,
  grassDark: 0x248b46,
  sand: 0xf4c96e,
  sandDark: 0xc98842,
  coral: 0xff6f7d,
  shell: 0xf4f0d4,
  player: 0xffd05a,
  playerDark: 0x334155,
  danger: 0xf43f5e,
  fruit: 0xffd84a,
};

const THEMES = {
  beach: {
    label: 'Summer Shore',
    sky: 0x65d7ff,
    ocean: 0x37b8d6,
    sand: 0xf4c96e,
    grass: 0x4fc45a,
    grassDark: 0x248b46,
    tile: 'tile-grass-sand',
    water: 'water-wide',
    prop: 'palm',
    spring: 'spring',
    spike: 'shell-spike',
    enemy: 'crab-0',
    collectible: 'fruit-star-clean',
    checkpoint: 'checkpoint-flag',
    finish: 'finish-flag',
    projectile: 'projectile-beach',
    boss: 'boss-beach',
    bossFx: 'fx-hit',
  },
  winter: {
    label: 'Snowdrift Coast',
    sky: 0xbbe7ff,
    ocean: 0x91d8f7,
    sand: 0xd8edf5,
    grass: 0xf4fbff,
    grassDark: 0x9fc9d9,
    tile: 'tile-winter',
    water: 'water-winter',
    prop: 'prop-winter',
    spring: 'spring-winter',
    spike: 'spike-winter',
    enemy: 'enemy-winter',
    collectible: 'collect-winter',
    checkpoint: 'checkpoint-winter',
    finish: 'finish-winter',
    projectile: 'projectile-winter',
    boss: 'boss-winter',
    bossFx: 'fx-ice',
  },
  desert: {
    label: 'Sunbaked Dunes',
    sky: 0xffc875,
    ocean: 0xdf9f3f,
    sand: 0xd99b4a,
    grass: 0xf6d37a,
    grassDark: 0xbc7a35,
    tile: 'tile-desert',
    water: 'water-desert',
    prop: 'prop-desert',
    spring: 'spring-desert',
    spike: 'spike-desert',
    enemy: 'enemy-desert',
    collectible: 'collect-desert',
    checkpoint: 'checkpoint-desert',
    finish: 'finish-desert',
    projectile: 'projectile-desert',
    boss: 'boss-desert',
    bossFx: 'fx-burst',
  },
  lava: {
    label: 'Ember Keep',
    sky: 0x3a2133,
    ocean: 0xff4b1f,
    sand: 0x463044,
    grass: 0x7f2f3f,
    grassDark: 0xff7a1a,
    tile: 'tile-lava',
    water: 'water-lava',
    prop: 'prop-lava',
    spring: 'spring-lava',
    spike: 'spike-lava',
    enemy: 'enemy-lava',
    collectible: 'collect-lava',
    checkpoint: 'checkpoint-lava',
    finish: 'finish-lava',
    projectile: 'projectile-lava',
    boss: 'boss-lava',
    bossFx: 'fx-fire',
  },
};

const BASE_PLATFORMS = [
  { x: 0, y: 640, w: 520, h: 80 },
  { x: 620, y: 610, w: 230, h: 60 },
  { x: 930, y: 560, w: 260, h: 60 },
  { x: 1280, y: 600, w: 280, h: 60 },
  { x: 1660, y: 520, w: 220, h: 50 },
  { x: 1980, y: 465, w: 260, h: 50 },
  { x: 2320, y: 575, w: 320, h: 60 },
  { x: 2740, y: 500, w: 240, h: 55 },
  { x: 3060, y: 620, w: 540, h: 80 },
  { x: 390, y: 500, w: 110, h: 32 },
  { x: 1380, y: 420, w: 120, h: 32 },
  { x: 2460, y: 390, w: 150, h: 32 },
];

const BASE_FRUIT = [
  [170, 560], [280, 560], [430, 450], [700, 535], [1030, 490], [1140, 490],
  [1370, 350], [1500, 535], [1760, 455], [2100, 395], [2210, 395], [2420, 510],
  [2520, 320], [2860, 430], [3140, 555], [3260, 555], [3380, 555], [3500, 555],
];

const LEVELS = [
  {
    theme: 'beach',
    platforms: BASE_PLATFORMS,
    fruits: BASE_FRUIT,
    springs: [[835, 581], [2635, 546]],
    spikes: [[870, 622, 4], [1580, 654, 5], [2660, 654, 5]],
    enemies: [[1050, 520, 930, 1190], [2440, 535, 2320, 2640]],
    checkpoint: [2050, 410],
    finish: [WORLD.width - 140, 548],
  },
  {
    theme: 'winter',
    platforms: [
      { x: 0, y: 640, w: 440, h: 80 },
      { x: 560, y: 570, w: 180, h: 56 },
      { x: 820, y: 500, w: 160, h: 48 },
      { x: 1090, y: 590, w: 260, h: 60 },
      { x: 1480, y: 450, w: 170, h: 48 },
      { x: 1790, y: 360, w: 160, h: 44 },
      { x: 2120, y: 505, w: 260, h: 56 },
      { x: 2490, y: 600, w: 240, h: 60 },
      { x: 2910, y: 520, w: 210, h: 54 },
      { x: 3250, y: 640, w: 350, h: 80 },
    ],
    fruits: [[160, 560], [610, 500], [890, 430], [1160, 520], [1540, 380], [1840, 285], [2200, 430], [2560, 525], [2980, 450], [3350, 565]],
    springs: [[720, 533], [2390, 468]],
    spikes: [[450, 654, 4], [1010, 620, 3], [1660, 492, 3], [2740, 654, 4]],
    enemies: [[1220, 548, 1090, 1350], [2560, 558, 2490, 2730]],
    checkpoint: [2180, 428],
    finish: [3440, 568],
  },
  {
    theme: 'desert',
    platforms: [
      { x: 0, y: 640, w: 360, h: 80 },
      { x: 480, y: 600, w: 220, h: 60 },
      { x: 800, y: 640, w: 300, h: 80 },
      { x: 1240, y: 535, w: 180, h: 52 },
      { x: 1500, y: 455, w: 150, h: 48 },
      { x: 1780, y: 575, w: 300, h: 60 },
      { x: 2240, y: 470, w: 180, h: 52 },
      { x: 2540, y: 370, w: 170, h: 48 },
      { x: 2880, y: 560, w: 230, h: 60 },
      { x: 3260, y: 630, w: 340, h: 80 },
    ],
    fruits: [[180, 565], [550, 530], [930, 565], [1300, 465], [1560, 385], [1870, 505], [2310, 400], [2610, 300], [2950, 490], [3400, 555]],
    springs: [[1110, 604], [2100, 540], [3140, 595]],
    spikes: [[365, 654, 5], [710, 654, 3], [1660, 497, 4], [2750, 654, 5]],
    enemies: [[910, 598, 800, 1100], [1900, 535, 1780, 2080], [3380, 590, 3260, 3600]],
    checkpoint: [2260, 398],
    finish: [3470, 558],
  },
  {
    theme: 'lava',
    platforms: [
      { x: 0, y: 640, w: 420, h: 80 },
      { x: 560, y: 600, w: 210, h: 60 },
      { x: 910, y: 545, w: 230, h: 60 },
      { x: 1270, y: 590, w: 240, h: 60 },
      { x: 1640, y: 515, w: 210, h: 54 },
      { x: 1970, y: 455, w: 230, h: 54 },
      { x: 2320, y: 570, w: 270, h: 60 },
      { x: 2740, y: 495, w: 220, h: 55 },
      { x: 3100, y: 615, w: 500, h: 80 },
    ],
    fruits: BASE_FRUIT.map(([x, y], index) => [x, y - (index % 3 === 0 ? 34 : 10)]),
    springs: [[760, 571], [2580, 541]],
    spikes: [[780, 622, 5], [1510, 654, 6], [2600, 654, 7], [2960, 654, 5]],
    enemies: [[1030, 505, 910, 1140], [2440, 530, 2320, 2590], [3300, 575, 3100, 3550]],
    checkpoint: [2040, 400],
    finish: [WORLD.width - 140, 543],
  },
];

const WORLD_NODES = [
  { levelIndex: 0, label: 'Summer Shore', x: 155, y: 394 },
  { levelIndex: 1, label: 'Snowdrift Coast', x: 385, y: 176 },
  { levelIndex: 2, label: 'Sunbaked Dunes', x: 548, y: 360 },
  { levelIndex: 3, label: 'Ember Keep', x: 810, y: 332 },
];

function buildLevel(baseLevel, index) {
  const finishX = WORLD.width - 150;
  const extraY = [600, 535, 470, 620];
  const extraPlatforms = [
    { x: 3650, y: extraY[index], w: 260, h: 60 },
    { x: 4050, y: 540, w: 260, h: 56 },
    { x: 4480, y: 610, w: 310, h: 70 },
    { x: 4800, y: 640, w: 400, h: 80 },
  ];
  return {
    ...baseLevel,
    platforms: [...baseLevel.platforms, ...extraPlatforms],
    fruits: [...baseLevel.fruits, [3740, extraY[index] - 70], [4140, 470], [4560, 540], [5000, 565]],
    springs: [...baseLevel.springs, [3940, extraY[index] - 34]],
    spikes: [...baseLevel.spikes, [4300, 654, 4], [4750, 654, 5]],
    enemies: [...baseLevel.enemies, [3770, extraY[index] - 40, 3650, 3910], [4580, 570, 4480, 4790]],
    powerups: [
      { type: 'heart', x: 620, y: 470 },
      { type: 'shield', x: 1850, y: 300 },
      { type: 'speed', x: 2850, y: 430 },
      { type: 'triple', x: 4200, y: 460 },
    ],
    boss: { x: 4880, y: 545, health: 24 + index * 8, minX: 4740, maxX: 5080 },
    finish: [finishX, 568],
  };
}

const COMPLETED_KEY = 'sunset-shell-run-completed';
const sessionCompleted = new Set();
const POWERUP_LABELS = {
  heart: 'HEART POWERUP',
  shield: 'SHIELD POWERUP',
  speed: 'SPEED POWERUP',
  triple: 'TRIPLE SHOT POWERUP',
};

function getCompletedLevels() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
    return new Set([...sessionCompleted, ...(Array.isArray(saved) ? saved.filter(index => Number.isInteger(index) && index >= 0 && index < LEVELS.length) : [])]);
  } catch {
    return new Set(sessionCompleted);
  }
}

function saveCompletedLevel(levelIndex) {
  sessionCompleted.add(levelIndex);
  const completed = getCompletedLevels();
  completed.add(levelIndex);
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...completed]));
  } catch {
    // Storage may be disabled or full; finishing a level must still work.
  }
}

class SoundBank {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  play(type) {
    if (!this.enabled) {
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    this.ctx ??= new AudioContextClass();
    const tones = {
      jump: [260, 0.05],
      fruit: [640, 0.08],
      hurt: [120, 0.14],
      checkpoint: [520, 0.16],
      win: [760, 0.22],
    };
    const [frequency, duration] = tones[type] ?? [320, 0.08];
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type === 'hurt' ? 'sawtooth' : 'square';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    oscillator.connect(gain).connect(this.ctx.destination);
    oscillator.start();
    oscillator.stop(this.ctx.currentTime + duration);
  }
}

const sounds = new SoundBank();

class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMapScene');
    this.keys = null;
    this.marker = null;
    this.player = null;
    this.selectedNode = WORLD_NODES[0];
  }

  preload() {
    this.load.image('source-summer', `${import.meta.env.BASE_URL}assets/sprites/summer-sprite-atlas.png`);
    this.load.image('source-upgrades', `${import.meta.env.BASE_URL}assets/sprites/atlas-upgrades.png`);
    this.load.image('world-map', `${import.meta.env.BASE_URL}assets/sprites/world-map.png`);
    this.load.image('player-idle', `${import.meta.env.BASE_URL}assets/sprites/player-idle.png`);
    ['player-run-0', 'player-run-1', 'player-run-2', 'player-run-3', 'player-run-4', 'player-run-5'].forEach((key) => {
      this.load.image(key, `${import.meta.env.BASE_URL}assets/sprites/${key}.png`);
    });
  }

  create() {
    prepareSpriteFrames(this);
    this.hideLevelComplete();
    this.createAnimations();
    this.add.image(480, 270, 'world-map').setDisplaySize(960, 540);
    this.createNodes();
    this.player = this.add.sprite(WORLD_NODES[0].x, WORLD_NODES[0].y - 24, 'player-idle').setDisplaySize(38, 62);
    this.marker = this.add.circle(WORLD_NODES[0].x, WORLD_NODES[0].y, 34, 0xffffff, 0.18)
      .setStrokeStyle(4, 0xffd84a, 1);
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
      start: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearTouch();
    });
    this.updateHud(`Choose world: ${this.selectedNode.label}`);
  }

  createAnimations() {
    if (!this.anims.exists('map-player-run')) {
      this.anims.create({
        key: 'map-player-run',
        frames: ['player-run-0', 'player-run-1', 'player-run-2', 'player-run-3', 'player-run-4', 'player-run-5'].map((key) => ({ key })),
        frameRate: 9,
        repeat: -1,
      });
    }
  }

  createNodes() {
    const completed = getCompletedLevels();
    WORLD_NODES.forEach((node, index) => {
      const isComplete = completed.has(node.levelIndex);
      const color = isComplete ? 0x34d399 : 0xffd84a;
      const ring = this.add.circle(node.x, node.y, 28, color, 0.2).setStrokeStyle(3, color, 1);
      this.tweens.add({ targets: ring, scale: 1.08, duration: 850 + index * 80, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      if (isComplete) {
        this.add.text(node.x, node.y - 2, '✓', {
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          stroke: '#0f5132',
          strokeThickness: 4,
        }).setOrigin(0.5);
      }
      this.add.text(node.x, node.y + 38, `${index + 1}`, {
        color: '#172033',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        stroke: '#fff6c7',
        strokeThickness: 5,
      }).setOrigin(0.5);
    });
  }

  update(time, delta) {
    const speed = 160;
    const distance = (speed * delta) / 1000;
    let dx = 0;
    let dy = 0;
    if (this.keys.left.isDown || this.keys.leftArrow.isDown || touchHeld.has('left')) dx -= distance;
    if (this.keys.right.isDown || this.keys.rightArrow.isDown || touchHeld.has('right')) dx += distance;
    if (this.keys.up.isDown || this.keys.upArrow.isDown) dy -= distance;
    if (this.keys.down.isDown || this.keys.downArrow.isDown) dy += distance;

    this.player.x = Phaser.Math.Clamp(this.player.x + dx, 30, 930);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy, 70, 500);
    if (dx !== 0) {
      this.player.setFlipX(dx < 0);
    }
    if (dx !== 0 || dy !== 0) {
      this.player.play('map-player-run', true);
    } else {
      this.player.stop();
      this.player.setTexture('player-idle');
    }

    const nearest = this.getNearestNode();
    if (nearest !== this.selectedNode) {
      this.selectedNode = nearest;
      this.updateHud(`Choose world: ${nearest.label}`);
    }
    this.marker.setPosition(this.selectedNode.x, this.selectedNode.y);

    if (justPressed('start')) {
      this.scene.start('GameScene', { levelIndex: this.selectedNode.levelIndex });
    }
  }

  getNearestNode() {
    return WORLD_NODES.reduce((best, node) => {
      const bestDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y + 24, best.x, best.y);
      const nodeDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y + 24, node.x, node.y);
      return nodeDistance < bestDistance ? node : best;
    }, WORLD_NODES[0]);
  }

  updateHud(status) {
    document.querySelector('#fruit').textContent = 'World map';
    document.querySelector('#lives').textContent = 'Enter';
    document.querySelector('#power').textContent = 'Choose';
    document.querySelector('#level-name').textContent = 'Choose world';
    document.querySelector('#progress-fill').style.width = '0%';
    this.clearMinimap();
    document.querySelector('#status').textContent = status;
  }

  clearMinimap() {
    const canvas = document.querySelector('#minimap');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  hideLevelComplete() {
    document.querySelector('#level-complete').hidden = true;
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.state = null;
    this.keys = null;
    this.player = null;
    this.playerArt = null;
    this.platforms = null;
    this.hazards = null;
    this.springs = null;
    this.fruits = null;
    this.enemies = null;
    this.powerups = null;
    this.projectiles = null;
    this.boss = null;
    this.finish = null;
    this.checkpoint = null;
    this.spawnPoint = { x: 100, y: 560 };
    this.coyoteUntil = 0;
    this.jumpBufferedUntil = 0;
    this.jumpsUsed = 0;
    this.invulnerableUntil = 0;
    this.pausedByPlayer = false;
    this.shootCooldownUntil = 0;
    this.shootUntil = 0;
    this.shieldUntil = 0;
    this.speedUntil = 0;
    this.tripleUntil = 0;
    this.bossDefeated = false;
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.theme = THEMES[this.level.theme];
  }

  init(data) {
    if (Number.isInteger(data?.levelIndex)) {
      this.levelIndex = Phaser.Math.Clamp(data.levelIndex, 0, LEVELS.length - 1);
    }
  }

  preload() {
    this.load.image('source-summer', `${import.meta.env.BASE_URL}assets/sprites/summer-sprite-atlas.png`);
    this.load.image('source-upgrades', `${import.meta.env.BASE_URL}assets/sprites/atlas-upgrades.png`);
    [
      'player-idle', 'player-run-0', 'player-run-1', 'player-run-2', 'player-run-3',
      'player-run-4', 'player-run-5', 'player-jump', 'player-fall',
      'crab-0', 'crab-1', 'crab-2', 'crab-3',
      'fruit-star-clean', 'fruit-star-padded', 'shell-spike', 'tile-grass-sand', 'tile-sand', 'spring',
      'checkpoint-flag', 'finish-flag', 'palm', 'cloud', 'flower-bush',
      'small-flower', 'water-wide', 'sparkles',
      'tile-winter', 'water-winter', 'prop-winter', 'spring-winter',
      'spike-winter', 'enemy-winter', 'collect-winter', 'checkpoint-winter', 'finish-winter',
      'tile-desert', 'water-desert', 'prop-desert', 'spring-desert',
      'spike-desert', 'enemy-desert', 'collect-desert', 'checkpoint-desert', 'finish-desert',
      'tile-lava', 'water-lava', 'prop-lava', 'spring-lava',
      'spike-lava', 'enemy-lava', 'collect-lava', 'checkpoint-lava', 'finish-lava',
      'projectile-beach', 'projectile-winter', 'projectile-desert', 'projectile-lava',
      'power-heart', 'power-shield', 'power-speed', 'power-triple',
      'mob-bat', 'mob-beetle', 'mob-turret',
      'boss-beach', 'boss-winter', 'boss-desert', 'boss-lava',
      'fx-hit', 'fx-ice', 'fx-burst', 'fx-fire', 'fx-explosion',
      'ui-level-banner', 'ui-power-ring', 'ui-starburst', 'ui-confetti',
      'ui-power-heart', 'ui-power-shield', 'ui-power-speed', 'ui-power-triple',
      'world-map',
    ].forEach((key) => {
      this.load.image(key, `${import.meta.env.BASE_URL}assets/sprites/${key}.png`);
    });
  }

  create() {
    prepareSpriteFrames(this);
    this.resetState();
    this.hideLevelComplete();
    this.createAnimations();
    this.createWorld();
    this.createGroups();
    this.createPlayer();
    this.createObjects();
    this.createPhysics();
    this.createInput();
    this.createCamera();
    this.updateHud('Reach the flag');
    this.updateProgress();
  }

  createAnimations() {
    if (!this.anims.exists('player-run')) {
      this.anims.create({
        key: 'player-run',
        frames: ['player-run-0', 'player-run-1', 'player-run-2', 'player-run-3', 'player-run-4', 'player-run-5'].map((key) => ({ key })),
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!this.anims.exists('crab-walk')) {
      this.anims.create({
        key: 'crab-walk',
        frames: ['crab-0', 'crab-1', 'crab-2', 'crab-3'].map((key) => ({ key })),
        frameRate: 6,
        repeat: -1,
      });
    }
  }

  resetState() {
    this.level = buildLevel(LEVELS[this.levelIndex], this.levelIndex);
    this.theme = THEMES[this.level.theme];
    this.bossDefeated = false;
    this.shieldUntil = 0;
    this.speedUntil = 0;
    this.tripleUntil = 0;
    this.spawnPoint = { x: 100, y: 560 };
    this.state = {
      lives: PLAYER.maxLives,
      fruit: 0,
      totalFruit: this.level.fruits.length,
      checkpointReached: false,
      won: false,
      dead: false,
      paused: false,
    };
  }

  createWorld() {
    this.physics.world.gravity.y = PLAYER.gravityY;
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height + 300);

    this.add.rectangle(0, 0, WORLD.width, WORLD.height, this.theme.sky).setOrigin(0);
    this.add.rectangle(0, 545, WORLD.width, 175, this.theme.ocean).setOrigin(0).setScrollFactor(0.45);

    for (let i = 0; i < 18; i += 1) {
      const x = i * 230 + 80;
      const y = 95 + (i % 4) * 28;
      const cloudAlpha = this.level.theme === 'lava' ? 0.25 : 0.82;
      this.add.image(x, y, 'cloud').setDisplaySize(140, 68).setTint(this.theme.sky).setAlpha(cloudAlpha).setScrollFactor(0.25);
    }

    for (let i = 0; i < 10; i += 1) {
      this.createPalm(i * 360 + 130, WORLD.groundY - 44, 0.55);
    }

    for (let x = 0; x < WORLD.width; x += 360) {
      this.add.image(x + 180, 675, this.theme.water).setDisplaySize(380, 138).setScrollFactor(0.35);
    }
    this.createAtmosphere();
  }

  createAtmosphere() {
    const particles = {
      beach: { color: 0xffffff, count: 16, yMin: 120, yMax: 520, alpha: 0.35 },
      winter: { color: 0xe0f7ff, count: 42, yMin: 80, yMax: 520, alpha: 0.72 },
      desert: { color: 0xffe1a1, count: 34, yMin: 240, yMax: 610, alpha: 0.38 },
      lava: { color: 0xff7a1a, count: 48, yMin: 160, yMax: 620, alpha: 0.55 },
    }[this.level.theme];
    for (let i = 0; i < particles.count; i += 1) {
      const dot = this.add.circle(
        Phaser.Math.Between(0, WORLD.width),
        Phaser.Math.Between(particles.yMin, particles.yMax),
        Phaser.Math.Between(1, 3),
        particles.color,
        particles.alpha,
      ).setScrollFactor(0.55);
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(18, 46),
        x: dot.x + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(1400, 2800),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  createPalm(x, y, scrollFactor) {
    this.add.image(x, y - 88, this.theme.prop).setDisplaySize(135, 214).setScrollFactor(scrollFactor);
  }

  createGroups() {
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.springs = this.physics.add.staticGroup();
    this.fruits = this.physics.add.staticGroup();
    this.powerups = this.physics.add.staticGroup();
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group({ allowGravity: true, immovable: false });
  }

  createPlatform(x, y, width, height) {
    const visual = this.add.container(x + width / 2, y + height / 2);
    visual.add(this.add.rectangle(0, 0, width, height, this.theme.sand));
    visual.add(this.add.rectangle(0, -height / 2 + 8, width, 16, this.theme.grass));
    visual.add(this.add.rectangle(0, -height / 2 + 18, width, 8, this.theme.grassDark));
    const tileCount = Math.max(1, Math.ceil(width / 110));
    const tileWidth = width / tileCount;
    for (let i = 0; i < tileCount; i += 1) {
      visual.add(this.add.image(-width / 2 + tileWidth * i + tileWidth / 2, 0, this.theme.tile).setDisplaySize(tileWidth + 2, height));
    }
    const collider = this.add.zone(x + width / 2, y + height / 2, width, height);
    this.physics.add.existing(collider, true);
    collider.body.setSize(width, height);
    collider.body.updateFromGameObject();
    this.platforms.add(collider);
    return collider;
  }

  createPlayer() {
    this.player = this.add.rectangle(this.spawnPoint.x, this.spawnPoint.y, PLAYER.bodyWidth, PLAYER.bodyHeight, 0xffffff, 0);
    this.playerArt = this.add.sprite(this.spawnPoint.x, this.spawnPoint.y - 3, 'player-idle');
    this.playerArt.setDisplaySize(72, 114);
    this.playerArt.setOrigin(0.5, 1);
    this.playerArt.setAlpha(1);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(false);
    this.player.body.setSize(PLAYER.bodyWidth, PLAYER.bodyHeight);
  }

  createObjects() {
    this.level.platforms.forEach((platform) => this.createPlatform(platform.x, platform.y, platform.w, platform.h));
    this.level.springs.forEach(([x, y]) => this.createSpring(x, y));
    this.level.spikes.forEach(([x, y, count]) => this.createShellSpikes(x, y, count));
    this.level.enemies.forEach(([x, y, minX, maxX]) => this.createEnemy(x, y, minX, maxX));
    this.level.fruits.forEach(([x, y]) => this.createFruit(x, y));
    this.level.powerups.forEach((powerup) => this.createPowerup(powerup));
    this.createBoss(this.level.boss);
    this.createCheckpoint(...this.level.checkpoint);
    this.createFinish(...this.level.finish);
  }

  createSpring(x, y) {
    const spring = this.physics.add.staticImage(x, y, this.theme.spring).setDisplaySize(72, 58);
    spring.kind = 'spring';
    spring.refreshBody();
    this.springs.add(spring);
    spring.body.setSize(68, 30);
    spring.body.updateFromGameObject();
  }

  createShellSpikes(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const shell = this.physics.add.staticImage(x + i * 38, y - 11, this.theme.spike).setDisplaySize(46, 38);
      shell.kind = 'spike';
      shell.refreshBody();
      this.hazards.add(shell);
      shell.body.setSize(38, 26);
      shell.body.updateFromGameObject();
    }
  }

  createEnemy(x, y, minX, maxX) {
    const crab = this.physics.add.sprite(x, y, this.theme.enemy).setDisplaySize(58, 44);
    crab.minX = minX;
    crab.maxX = maxX;
    this.enemies.add(crab);
    crab.body.setSize(62, 42).setOffset(0, 2);
    crab.body.setVelocityX(70);
    crab.body.setBounceX(1);
    if (this.theme.enemy === 'crab-0') {
      crab.play('crab-walk');
    }
  }

  createFruit(x, y) {
    const fruit = this.physics.add.staticImage(x, y, this.theme.collectible).setDisplaySize(42, 40);
    fruit.refreshBody();
    this.fruits.add(fruit);
    fruit.body.setCircle(16);
    fruit.body.updateFromGameObject();
    this.tweens.add({ targets: fruit, y: y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  createPowerup({ type, x, y }) {
    const texture = {
      heart: 'power-heart',
      shield: 'power-shield',
      speed: 'power-speed',
      triple: 'power-triple',
    }[type];
    const powerup = this.physics.add.staticImage(x, y, texture).setDisplaySize(42, 42);
    powerup.type = type;
    powerup.refreshBody();
    powerup.body.setCircle(18);
    powerup.body.updateFromGameObject();
    this.powerups.add(powerup);
    this.tweens.add({ targets: powerup, y: y - 10, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  createBoss({ x, y, health, minX, maxX }) {
    this.boss = this.physics.add.sprite(x, y, this.theme.boss).setDisplaySize(132, 132);
    this.boss.health = health;
    this.boss.maxHealth = health;
    this.boss.lastHitAt = -9999;
    this.boss.minX = minX;
    this.boss.maxX = maxX;
    this.boss.body.setSize(this.boss.width * 0.72, this.boss.height * 0.78).setOffset(this.boss.width * 0.14, this.boss.height * 0.16);
    this.boss.body.setVelocityX(-45);
    this.boss.body.setCollideWorldBounds(false);
    this.bossBar = this.add.rectangle(x, y - 88, 110, 10, 0x16a34a).setOrigin(0.5);
    this.bossBarBack = this.add.rectangle(x, y - 88, 114, 14, 0x111827, 0.72).setOrigin(0.5);
  }

  createCheckpoint(x, y) {
    this.checkpoint = this.physics.add.staticImage(x, y, this.theme.checkpoint).setDisplaySize(86, 96);
    this.checkpoint.refreshBody();
    this.checkpoint.body.setSize(54, 90);
    this.checkpoint.body.updateFromGameObject();
  }

  createFinish(x, y) {
    this.finish = this.physics.add.staticImage(x, y, this.theme.finish).setDisplaySize(94, 100);
    this.finish.refreshBody();
    this.finish.body.setSize(120, 130);
    this.finish.body.updateFromGameObject();
  }

  createPhysics() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.boss, this.platforms);
    this.physics.add.overlap(this.player, this.fruits, this.collectFruit, undefined, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, undefined, this);
    this.physics.add.overlap(this.player, this.hazards, this.touchHazard, undefined, this);
    this.physics.add.overlap(this.player, this.springs, this.touchSpring, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.touchEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.boss, this.touchBoss, undefined, this);
    this.physics.add.overlap(this.projectiles, this.enemies, this.projectileHitEnemy, undefined, this);
    this.physics.add.overlap(this.projectiles, this.boss, this.projectileHitBoss, undefined, this);
    this.physics.add.overlap(this.player, this.checkpoint, this.touchCheckpoint, undefined, this);
    this.physics.add.overlap(this.player, this.finish, this.winGame, undefined, this);
  }

  createInput() {
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shoot: Phaser.Input.Keyboard.KeyCodes.F,
      shootAlt: Phaser.Input.Keyboard.KeyCodes.J,
      run: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      next: Phaser.Input.Keyboard.KeyCodes.ENTER,
      map: Phaser.Input.Keyboard.KeyCodes.M,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearTouch();
    });
  }

  createCamera() {
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.12, 0, 90);
  }

  update(time) {
    if (justPressed('restart')) {
      this.scene.restart();
      return;
    }
    if (justPressed('map')) {
      this.scene.start('WorldMapScene');
      return;
    }
    if (justPressed('pause')) {
      this.togglePause();
      return;
    }
    const startRequested = justPressed('start');
    if ((this.state.won || this.state.dead) && startRequested) {
      if (this.state.dead) this.scene.restart();
      else this.nextLevel();
      return;
    }
    if (this.state.paused) {
      clearTouch();
      this.player.body.setVelocityX(0);
      return;
    }
    if (this.state.dead || this.state.won) {
      clearTouch();
      this.player.body.setVelocityX(0);
      this.syncPlayerArt();
      return;
    }
    this.updatePlayer(time);
    this.updateEnemies();
    this.updateBoss();
    this.updateProjectiles();
    if (this.player.y > WORLD.height + 120) {
      this.damagePlayer();
    }
    if ((this.bossDefeated || !this.boss?.active || this.boss.health <= 0) && this.player.x >= this.finish.x - 70) {
      this.winGame();
    }
    this.updateProgress();
    this.updatePowerHud();
  }

  updatePlayer(time) {
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) {
      this.coyoteUntil = time + PLAYER.coyoteTimeMs;
      this.jumpsUsed = 0;
    }
    if (justPressed('jump')) {
      this.jumpBufferedUntil = time + PLAYER.jumpBufferMs;
    }
    if (justPressed('shoot')) {
      this.shoot(time);
    }

    const hasSpeed = this.speedUntil > time;
    const speed = this.keys.run.isDown || hasSpeed ? PLAYER.runSpeed + (hasSpeed ? 70 : 0) : PLAYER.walkSpeed;
    let targetVelocity = 0;
    if (this.keys.left.isDown || this.keys.leftArrow.isDown || touchHeld.has('left')) {
      targetVelocity = -speed;
      this.playerArt.setFlipX(true);
    } else if (this.keys.right.isDown || this.keys.rightArrow.isDown || touchHeld.has('right')) {
      targetVelocity = speed;
      this.playerArt.setFlipX(false);
    }
    const control = onGround ? 1 : PLAYER.airControl;
    this.player.body.setVelocityX(Phaser.Math.Linear(this.player.body.velocity.x, targetVelocity, control));

    if (this.jumpBufferedUntil > time && (this.coyoteUntil > time || this.jumpsUsed < PLAYER.maxJumps)) {
      this.player.body.setVelocityY(PLAYER.jumpVelocity);
      this.jumpBufferedUntil = 0;
      this.coyoteUntil = 0;
      this.jumpsUsed += 1;
      sounds.play('jump');
      this.burst(this.player.x, this.player.y + 28, COLORS.shell, 8);
    }

    if (this.keys.up.isDown || this.keys.upArrow.isDown) {
      this.cameras.main.setFollowOffset(0, 135);
    } else if (this.keys.down.isDown || this.keys.downArrow.isDown) {
      this.cameras.main.setFollowOffset(0, 35);
    } else {
      this.cameras.main.setFollowOffset(0, 90);
    }

    if (!onGround) {
      this.playerArt.setTexture(this.player.body.velocity.y < 0 ? 'player-jump' : 'player-fall');
    } else if (Math.abs(this.player.body.velocity.x) > 12) {
      this.playerArt.play('player-run', true);
    } else {
      this.playerArt.stop();
      this.playerArt.setTexture('player-idle');
    }
    if (time < this.shootUntil) {
      this.playerArt.stop();
      this.playerArt.setTexture('player-run-0');
      this.playerArt.setTint(0xfff4a3);
    } else {
      this.playerArt.clearTint();
    }
    this.syncPlayerArt();
  }

  syncPlayerArt() {
    this.playerArt.setPosition(this.player.x, this.player.y + PLAYER.bodyHeight / 2 + 4.4);
  }

  updateEnemies() {
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.body) {
        return;
      }
      if (enemy.x <= enemy.minX) {
        enemy.body.setVelocityX(70);
      }
      if (enemy.x >= enemy.maxX) {
        enemy.body.setVelocityX(-70);
      }
    });
  }

  updateBoss() {
    if (!this.boss?.active || this.bossDefeated) {
      return;
    }
    if (Math.abs(this.player.x - this.boss.x) < 520) {
      document.querySelector('#status').textContent = `Boss HP ${Math.max(0, this.boss.health)}/${this.boss.maxHealth}`;
    }
    if (this.boss.x <= this.boss.minX) {
      this.boss.body.setVelocityX(45);
      this.boss.setFlipX(false);
    }
    if (this.boss.x >= this.boss.maxX) {
      this.boss.body.setVelocityX(-45);
      this.boss.setFlipX(true);
    }
    this.bossBarBack?.setPosition(this.boss.x, this.boss.y - 88);
    this.bossBar?.setPosition(this.boss.x, this.boss.y - 88);
    const ratio = Phaser.Math.Clamp(this.boss.health / this.boss.maxHealth, 0, 1);
    this.bossBar?.setDisplaySize(110 * ratio, 10);
    if (Math.abs(this.player.x - this.boss.x) < 650 && this.time.now % 900 < 18) {
      this.burst(this.boss.x, this.boss.y - 40, this.theme.ocean, 5);
    }
  }

  updateProjectiles() {
    this.projectiles.children.iterate((projectile) => {
      if (!projectile?.active) {
        return;
      }
      this.enemies.children.iterate((enemy) => {
        if (!enemy?.visible || !projectile.active) {
          return;
        }
        const nearX = Math.abs(projectile.x - enemy.x) < 58;
        const nearY = Math.abs(projectile.y - enemy.y) < 44;
        if (nearX && nearY) {
          this.projectileHitEnemy(projectile, enemy);
        }
      });
      if (projectile.x < this.cameras.main.worldView.x - 120 || projectile.x > this.cameras.main.worldView.right + 120) {
        projectile.destroy();
      }
    });
  }

  shoot(time) {
    if (time < this.shootCooldownUntil) {
      return;
    }
    this.shootCooldownUntil = time + 230;
    this.shootUntil = time + 150;
    const direction = this.playerArt.flipX ? -1 : 1;
    const offsets = this.tripleUntil > time ? [-14, 0, 14] : [0];
    offsets.forEach((offsetY) => {
      const projectile = this.projectiles.create(this.player.x + direction * 30, this.player.y - 10 + offsetY, this.theme.projectile);
      projectile.setDisplaySize(48, 28);
      projectile.body.setSize(56, 36).setOffset(-4, -4);
      projectile.body.setVelocityX(direction * 560);
      projectile.damage = 1;
      projectile.direction = direction;
    });
    this.createMuzzleFlash(direction);
    this.cameras.main.shake(35, 0.0015);
    sounds.play('fruit');
  }

  createMuzzleFlash(direction) {
    const x = this.player.x + direction * 36;
    const y = this.player.y - 14;
    const flash = this.add.image(x, y, this.theme.projectile).setDisplaySize(30, 16).setFlipX(direction < 0);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 110,
      ease: 'Quad.out',
      onComplete: () => flash.destroy(),
    });
  }

  collectFruit(player, fruit) {
    fruit.body.enable = false;
    fruit.setVisible(false);
    this.state.fruit += 1;
    sounds.play('fruit');
    this.burst(fruit.x, fruit.y, COLORS.fruit, 12);
    this.updateHud('Good collect');
  }

  collectPowerup(player, powerup) {
    powerup.body.enable = false;
    powerup.setVisible(false);
    const now = this.time.now;
    if (powerup.type === 'heart') {
      this.state.lives = Math.min(PLAYER.maxLives + 2, this.state.lives + 1);
      this.updateHud('Extra life');
    }
    if (powerup.type === 'shield') {
      this.shieldUntil = now + 9000;
      this.updateHud('Shield online');
    }
    if (powerup.type === 'speed') {
      this.speedUntil = now + 8000;
      this.updateHud('Speed boost');
    }
    if (powerup.type === 'triple') {
      this.tripleUntil = now + 10000;
      this.updateHud('Triple shot');
    }
    this.showPowerupToast(POWERUP_LABELS[powerup.type] ?? 'POWERUP');
    this.burst(powerup.x, powerup.y, COLORS.fruit, 18);
    sounds.play('checkpoint');
  }

  touchHazard(player, hazard) {
    this.damagePlayer();
  }

  touchSpring(player, spring) {
    const landedOnSpring = player.body.velocity.y > 0 && player.y < spring.y - 8;
    if (landedOnSpring) {
      player.body.setVelocityY(-560);
      this.jumpsUsed = 1;
      this.tweens.add({ targets: spring, scaleY: 0.7, duration: 70, yoyo: true });
      this.burst(spring.x, spring.y, 0x38bdf8, 12);
      sounds.play('jump');
    }
  }

  touchEnemy(player, enemy) {
    if (!enemy.visible) {
      return;
    }
    if (player.body.velocity.y > 80 && player.y < enemy.y - 8) {
      enemy.body.enable = false;
      enemy.setVisible(false);
      player.body.setVelocityY(-300);
      this.burst(enemy.x, enemy.y, COLORS.coral, 18);
      sounds.play('fruit');
      this.updateHud('Crab bounced');
      return;
    }
    this.damagePlayer();
  }

  touchBoss() {
    this.damagePlayer();
  }

  projectileHitEnemy(projectile, enemy) {
    projectile.destroy();
    if (!enemy.visible) {
      return;
    }
    enemy.body.enable = false;
    enemy.setVisible(false);
    this.burst(enemy.x, enemy.y, COLORS.coral, 14);
    sounds.play('hurt');
  }

  projectileHitBoss(projectile, boss) {
    if (this.bossDefeated || !boss.active) {
      return;
    }
    projectile.destroy();
    if (this.time.now - boss.lastHitAt < 130) {
      return;
    }
    boss.lastHitAt = this.time.now;
    boss.health -= projectile.damage ?? 1;
    boss.setTint(0xffffff);
    this.time.delayedCall(70, () => boss.clearTint());
    this.burst(projectile.x, projectile.y, COLORS.fruit, 10);
    this.cameras.main.shake(55, 0.003);
    if (boss.health <= 0) {
      this.defeatBoss();
    }
  }

  defeatBoss() {
    this.bossDefeated = true;
    this.boss.health = 0;
    this.boss.disableBody(true, true);
    this.bossBar?.destroy();
    this.bossBarBack?.destroy();
    this.burst(this.boss.x, this.boss.y, COLORS.fruit, 60);
    this.cameras.main.flash(180, 255, 210, 80);
    this.updateHud('Boss defeated. Finish unlocked');
    sounds.play('win');
  }

  touchCheckpoint() {
    if (this.state.checkpointReached) {
      return;
    }
    this.state.checkpointReached = true;
    this.spawnPoint = { x: this.checkpoint.x, y: this.checkpoint.y - 20 };
    this.checkpoint.setTint(0x93c5fd);
    this.cameras.main.flash(140, 255, 244, 180);
    this.burst(this.checkpoint.x, this.checkpoint.y, 0x60a5fa, 20);
    sounds.play('checkpoint');
    this.updateHud('Checkpoint');
  }

  winGame() {
    if (this.state.won) {
      return;
    }
    const bossCleared = this.bossDefeated || !this.boss?.active || this.boss.health <= 0;
    if (!bossCleared) {
      this.updateHud('Boss blocks the flag. Shoot it with F/J');
      this.cameras.main.shake(120, 0.004);
      return;
    }
    this.bossDefeated = true;
    this.state.won = true;
    saveCompletedLevel(this.levelIndex);
    this.player.body.setVelocity(0, 0);
    this.cameras.main.flash(250, 255, 216, 74);
    this.burst(this.finish.x, this.finish.y, COLORS.fruit, 36);
    sounds.play('win');
    this.updateHud(`${this.theme.label} cleared. Press Enter`);
    this.showLevelComplete();
  }

  damagePlayer() {
    if (this.state.dead || this.state.won) {
      return;
    }
    const now = this.time.now;
    if (now < this.invulnerableUntil) {
      return;
    }
    if (now < this.shieldUntil) {
      this.shieldUntil = 0;
      this.invulnerableUntil = now + PLAYER.invulnerableMs;
      this.updateHud('Shield broke');
      this.burst(this.player.x, this.player.y, 0x60a5fa, 28);
      return;
    }
    this.invulnerableUntil = now + PLAYER.invulnerableMs;
    this.state.lives -= 1;
    sounds.play('hurt');
    this.cameras.main.shake(120, 0.008);
    this.updateHud(this.state.lives > 0 ? 'Try again' : 'Game over. Press R');

    if (this.state.lives <= 0) {
      this.state.dead = true;
      this.player.body.setVelocity(0, 0);
      this.playerArt.setAlpha(0.45);
      return;
    }

    this.respawnPlayer();
  }

  respawnPlayer() {
    this.player.body.setVelocity(0, 0);
    this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
    this.syncPlayerArt();
    this.tweens.killTweensOf(this.playerArt);
    this.playerArt.setAlpha(1);
    this.tweens.add({
      targets: this.playerArt,
      alpha: 0.35,
      duration: 90,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.playerArt.setAlpha(1),
    });
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 5), color);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-46, 46),
        y: y + Phaser.Math.Between(-36, 20),
        alpha: 0,
        duration: Phaser.Math.Between(240, 430),
        ease: 'Quad.out',
        onComplete: () => dot.destroy(),
      });
    }
  }

  updateHud(status) {
    document.querySelector('#fruit').textContent = `Fruit ${this.state.fruit}/${this.state.totalFruit}`;
    document.querySelector('#lives').textContent = `Lives ${this.state.lives}`;
    document.querySelector('#level-name').textContent = this.theme.label;
    document.querySelector('#status').textContent = status;
    this.updatePowerHud();
  }

  updateProgress() {
    const percent = Phaser.Math.Clamp((this.player.x / (WORLD.width - 120)) * 100, 0, 100);
    document.querySelector('#progress-fill').style.width = `${percent.toFixed(1)}%`;
    this.drawMinimap(percent);
  }

  updatePowerHud() {
    const now = this.time?.now ?? 0;
    const active = [];
    if (this.shieldUntil > now) active.push('Shield');
    if (this.speedUntil > now) active.push('Speed');
    if (this.tripleUntil > now) active.push('Triple');
    document.querySelector('#power').textContent = active.length ? active.join('+') : 'Blaster';
  }

  drawMinimap(percent) {
    const canvas = document.querySelector('#minimap');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(23, 32, 51, 0.30)';
    ctx.fillRect(8, 15, canvas.width - 16, 4);
    ctx.fillStyle = '#ffd84a';
    this.level.fruits.forEach(([x]) => ctx.fillRect(8 + (x / WORLD.width) * (canvas.width - 16), 11, 2, 10));
    ctx.fillStyle = this.bossDefeated ? '#34d399' : '#ef4444';
    ctx.fillRect(8 + (this.level.boss.x / WORLD.width) * (canvas.width - 16), 8, 4, 16);
    ctx.fillStyle = '#172033';
    ctx.beginPath();
    ctx.arc(8 + (percent / 100) * (canvas.width - 16), 17, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  togglePause() {
    this.state.paused = !this.state.paused;
    if (this.state.paused) {
      this.player.body.setVelocity(0, 0);
      document.querySelector('#status').textContent = 'Paused';
      this.showCenterMessage('Paused', 'Press P to resume');
      return;
    }
    this.hideLevelComplete();
    this.updateHud('Reach the flag');
  }

  showCenterMessage(title, subtitle) {
    const overlay = document.querySelector('#level-complete');
    overlay.className = '';
    overlay.querySelector('#overlay-art').src = `${import.meta.env.BASE_URL}assets/sprites/ui-power-ring.png`;
    overlay.querySelector('strong').textContent = title;
    overlay.querySelector('span').textContent = subtitle;
    overlay.hidden = false;
  }

  showPowerupToast(title) {
    const overlay = document.querySelector('#level-complete');
    const art = {
      'HEART POWERUP': 'ui-power-heart',
      'SHIELD POWERUP': 'ui-power-shield',
      'SPEED POWERUP': 'ui-power-speed',
      'TRIPLE SHOT POWERUP': 'ui-power-triple',
    }[title] ?? 'ui-power-ring';
    overlay.className = 'power-toast';
    overlay.querySelector('#overlay-art').src = `${import.meta.env.BASE_URL}assets/sprites/${art}.png`;
    overlay.querySelector('strong').textContent = title;
    overlay.querySelector('span').textContent = 'Power active';
    overlay.hidden = false;
    this.time.delayedCall(1500, () => {
      if (!this.state.won && !this.state.paused) {
        overlay.hidden = true;
        overlay.className = '';
      }
    });
  }

  showLevelComplete() {
    const overlay = document.querySelector('#level-complete');
    const nextLevel = LEVELS[this.levelIndex + 1];
    overlay.className = '';
    overlay.querySelector('#overlay-art').src = `${import.meta.env.BASE_URL}assets/sprites/ui-level-banner.png`;
    overlay.querySelector('strong').textContent = 'Level completed';
    overlay.querySelector('span').textContent = nextLevel
      ? `Next: ${THEMES[nextLevel.theme].label}. Enter, or M for map`
      : 'All levels cleared. Enter to loop, or M for map';
    overlay.hidden = false;
  }

  hideLevelComplete() {
    document.querySelector('#level-complete').hidden = true;
  }

  nextLevel() {
    if (this.levelIndex < LEVELS.length - 1) {
      this.levelIndex += 1;
    } else {
      this.levelIndex = 0;
    }
    this.scene.restart();
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#65d7ff',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [WorldMapScene, GameScene],
};

const game = new Phaser.Game(config);

function fitGame() {
  const shell = document.querySelector('#game-shell');
  const parent = document.querySelector('#game');
  const maxWidth = Math.min(1360, document.documentElement.clientWidth - 16);
  shell.style.width = `${maxWidth}px`;
  // HUD wrapping changes height as the game narrows; settle both constraints together.
  for (let pass = 0; pass < 4; pass += 1) {
    const chrome = ['hud', 'help', 'touch-controls'].reduce((sum, id) => sum + document.getElementById(id).getBoundingClientRect().height, 0);
    const width = Math.floor(Math.min(maxWidth, Math.max(160, (window.innerHeight - 16 - chrome) * 16 / 9)));
    shell.style.width = `${width}px`;
    parent.style.height = `${width * 9 / 16}px`;
  }
  game.scale.setParentSize(parent.clientWidth, parent.clientHeight);
}
window.addEventListener('resize', () => { clearTouch(); fitGame(); });
requestAnimationFrame(fitGame);
document.fonts.ready.then(fitGame);
window.__sunsetShellRunGame = game;

document.querySelector('#mute').addEventListener('click', (event) => {
  const enabled = sounds.toggle();
  event.currentTarget.textContent = enabled ? 'Sound' : 'Muted';
});
