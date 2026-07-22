import { Scene } from 'phaser';
import { useGameStore } from '../../store/gameStore';
import { LEVEL1_HUD_HEIGHT } from '../../utils/levelTheme';

const BPM = 92; // 略加快节拍，缩短通关时间
const BEAT_INTERVAL = 60000 / BPM; 
const DROP_TIME = 1500; // 时间从顶部落到判定线
const START_GRACE_MS = 1200; // 开局喘息时间，避免重开后立即掉落奶滴
const TRACK_TOP_GAP = 8;

interface Note {
  id: number;
  time: number; // The target hit time in game elapsed time
  track: 0 | 1; // 0 for left, 1 for right
  sprite?: Phaser.GameObjects.Sprite;
  active: boolean;
  hit: boolean;
}

export class Game extends Scene {
  private isPlaying = false;
  private isPaused = false;
  
  private leftTrackX!: number;
  private rightTrackX!: number;
  private hitY!: number;
  /** 轻微下移背景/表情，与旧版一致 */
  private contentOffsetY = 0;
  /** 奶滴轨迹起点（HUD 下缘 + 间距，仅影响音符与轨道线） */
  private trackTopY = LEVEL1_HUD_HEIGHT + TRACK_TOP_GAP;
  private lastHudHeight = 0;
  private trackGraphics?: Phaser.GameObjects.Graphics;
  
  private notes: Note[] = [];
  private noteIdCounter = 0;
  
  private startTime = 0;
  private pauseTime = 0;
  private pausedDuration = 0;
  private runId = -1;
  
  private nextSpawnIndex = 0;
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  
  // Visual elements
  private babyFace!: Phaser.GameObjects.Text;
  private leftBottle!: Phaser.GameObjects.Image;
  private rightBottle!: Phaser.GameObjects.Image;
  private babyTween?: Phaser.Tweens.Tween;
  
  // Audio elements
  private bgm!: Phaser.Sound.BaseSound;
  
  // Game logic state
  private storeUnsubscribe!: () => void;
  
  constructor() {
    super('MainGame');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    this.contentOffsetY = Math.round(height * 0.045);
    this.trackTopY = LEVEL1_HUD_HEIGHT + TRACK_TOP_GAP;
    this.leftTrackX = width * 0.22;
    this.rightTrackX = width * 0.78;
    this.hitY = height * 0.8 + this.contentOffsetY;

    // 全屏渲染，勿裁剪 viewport（裁剪会导致画面压缩错位）
    this.cameras.main.setViewport(0, 0, width, height);

    this.createBackground();
    this.createTracks();
    this.createBottles();
    this.createBaby();
    this.applyPlayAreaLayout(useGameStore.getState().level1HudHeight || LEVEL1_HUD_HEIGHT);

    // 第 1 关节奏玩法依赖 BGM，不受全局静音影响（静音只关菜单 BGM / 其它关音效）
    if (this.cache.audio.exists('bgm-women')) {
      if (!this.sound.get('bgm-women')) {
        this.bgm = this.sound.add('bgm-women', { loop: true, volume: 0.7 });
      } else {
        this.bgm = this.sound.get('bgm-women');
      }
    }

    // Input handlers
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying || this.isPaused) return;
      
      // Determine track based on x position
      const track = pointer.x < width / 2 ? 0 : 1;
      this.handleHit(track);
    });

    // Subscribe to state changes from React
    this.storeUnsubscribe = useGameStore.subscribe(
      (state) => {
        const shouldPlayLevel1 = state.status === 'playing' && state.currentLevelId === 1;
        this.cameras.main.setVisible(shouldPlayLevel1);

        if (shouldPlayLevel1 && (!this.isPlaying || state.runId !== this.runId)) {
          this.startGame(state.runId);
        } else if (!shouldPlayLevel1) {
          // 离开第一关（返回选关/首页/结算等）一律停游戏并停 BGM
          if (this.isPlaying) {
            this.stopGame();
          } else {
            this.stopBgm();
          }
        }

        if (shouldPlayLevel1) {
          if (state.gameplayPaused) {
            this.pauseGame();
          } else {
            this.resumeGame();
          }
        }
        
        // Update visuals based on fullness
        this.updateBottleLiquid(state.fullness);

        if (state.level1HudHeight !== this.lastHudHeight) {
          this.applyPlayAreaLayout(state.level1HudHeight);
        }
      }
    );

    const initial = useGameStore.getState();
    this.cameras.main.setVisible(initial.status === 'playing' && initial.currentLevelId === 1);
  }

  private getCurrentGameTime(time: number): number {
    let currentTime = time - this.startTime - this.pausedDuration;
    if (this.bgm && this.bgm.isPlaying) {
      const seekTime = (this.bgm as Phaser.Sound.WebAudioSound).seek * 1000;
      if (seekTime > 0) {
        currentTime = seekTime;
      }
    }
    return currentTime;
  }
  update(time: number, delta: number) {
    if (!this.isPlaying || this.isPaused) return;

    const currentTime = this.getCurrentGameTime(time);
    
    // Spawn notes — 与下落起点对齐，勿用 START_GRACE_MS 推迟生成（否则会直接出现在奶瓶附近）
    while (this.nextSpawnIndex < this.notes.length) {
      const note = this.notes[this.nextSpawnIndex];
      const fallStart = note.time - DROP_TIME;

      if (currentTime >= fallStart) {
        this.spawnNoteSprite(note);
        this.nextSpawnIndex++;
      } else {
        break;
      }
    }

    // Update notes positions
    for (const note of this.notes) {
      if (!note.active || !note.sprite || note.hit) continue;

      const timeRemaining = note.time - currentTime;

      if (timeRemaining < -300) {
        note.active = false;
        note.sprite.destroy();
        this.recordHitResult('oops', note.track);
        continue;
      }

      const fallStart = note.time - DROP_TIME;
      const elapsed = currentTime - fallStart;
      const progress = Phaser.Math.Clamp(elapsed / DROP_TIME, 0, 1);
      note.sprite.y = this.trackTopY + (this.hitY - this.trackTopY) * progress;
    }
  }

  private generateLevelData() {
    this.notes = [];
    this.nextSpawnIndex = 0;
    this.noteIdCounter = 0;
    
    // 《我们》 前奏较长，可能在十几秒后才开始唱，
    // 这里我们先从 4 秒处开始做一些轻量级的节拍，作为引导
    let time = 4000; 
    const totalNotes = 150; // 足够玩较长时间
    
    for (let i = 0; i < totalNotes; i++) {
      this.notes.push({
        id: this.noteIdCounter++,
        time: time,
        track: Math.random() > 0.5 ? 1 : 0,
        active: false,
        hit: false
      });
      // 在慢歌中，我们主要打正拍和半拍
      const interval = Math.random() > 0.4 ? BEAT_INTERVAL : BEAT_INTERVAL * 2;
      time += interval;
    }
  }

  private spawnNoteSprite(note: Note) {
    const x = note.track === 0 ? this.leftTrackX : this.rightTrackX;
    const sprite = this.add.sprite(x, this.trackTopY, 'note');
    sprite.setOrigin(0.5);
    sprite.setScale(0.8);
    sprite.setDepth(50);
    note.sprite = sprite;
    note.active = true;
  }

  private handleHit(track: 0 | 1) {
    const store = useGameStore.getState();
    const currentTime = this.getCurrentGameTime(this.time.now);
    
    // Trigger visual feedback on bottle
    this.pulseBottle(track);
    
    // Find the earliest active unhit note in the track
    const activeNotes = this.notes.filter(n => n.active && !n.hit && n.track === track);
    if (activeNotes.length === 0) {
      // Empty tap, count as Oops? Maybe just ignore to be forgiving.
      return;
    }
    
    const note = activeNotes[0];
    const diff = note.time - currentTime;
    const absDiff = Math.abs(diff);
    
    if (absDiff <= 100) {
      this.processHit(note, 'perfect');
    } else if (absDiff <= 250) {
      this.processHit(note, 'good');
    } else if (absDiff <= 400) {
      this.processHit(note, 'oops');
    } else {
      // Tap too early, don't count yet or count as oops?
      // Just ignore if it's way too early so we don't consume the note.
      if (diff < -400) {
         // Should have been destroyed in update(), but just in case
         this.processHit(note, 'oops');
      } else {
         // Too early
         // we can optionally record an oops without consuming the note
         // this.recordHitResult('oops', track);
      }
    }
  }

  private processHit(note: Note, type: 'perfect' | 'good' | 'oops') {
    note.hit = true;
    note.active = false;
    
    if (note.sprite) {
      if (type === 'perfect' || type === 'good') {
        // Visual explosion effect
        this.tweens.add({
          targets: note.sprite,
          scale: 1.5,
          alpha: 0,
          duration: 200,
          onComplete: () => note.sprite?.destroy()
        });
      } else {
        note.sprite.destroy();
      }
    }
    
    this.recordHitResult(type, note.track);
    this.playSound(type);
  }

  private recordHitResult(type: 'perfect' | 'good' | 'oops', track: 0 | 1) {
    const store = useGameStore.getState();
    store.recordHit(type);
    const fresh = useGameStore.getState();
    if (fresh.status === 'gameover') {
      const acc = fresh.stats.total > 0 ? (fresh.stats.perfect + fresh.stats.good) / fresh.stats.total : 0;
      const collectRatio = fresh.stats.totalNotesSpawned > 0 ? fresh.notesCollected / fresh.stats.totalNotesSpawned : 0;
      let stars = 1;
      if (acc >= 0.9 && collectRatio >= 0.6) stars = 3;
      else if (acc >= 0.7) stars = 2;
      store.completeLevel({
        stars,
        orangesCollected: stars,
        orangeTotal: 3
      });
      return;
    }
    
    const x = track === 0 ? this.leftTrackX : this.rightTrackX;
    this.showFloatingText(type, x, this.hitY - 50);
    this.updateBabyExpression(type);
    
    if (type === 'oops') {
      // Camera shake
      this.cameras.main.shake(100, 0.005);
    } else {
      this.spawnCollectibleDrop(track);
    }
  }

  private playSound(type: 'perfect' | 'good' | 'oops') {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'perfect' || type === 'good') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch(e) {
      // Ignored
    }
  }

  private pulseBottle(track: 0 | 1) {
    const x = track === 0 ? this.leftTrackX : this.rightTrackX;
    const targetBottle = track === 0 ? this.leftBottle : this.rightBottle;

    if (targetBottle) {
      this.tweens.add({
        targets: targetBottle,
        scaleX: 0.78,
        scaleY: 0.78,
        yoyo: true,
        duration: 100,
        ease: 'Cubic.easeOut'
      });
    }

    const g = this.add.graphics();
    g.setDepth(34);
    g.lineStyle(2, 0xB2CEE5, 1);
    g.strokeCircle(x, this.hitY, 60);
    this.tweens.add({
      targets: g,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy()
    });
  }

  private showFloatingText(type: 'perfect' | 'good' | 'oops', x: number, y: number) {
    const textConfig = {
      perfect: { text: 'Perfect', color: '#4a9fd8', scale: 1.5 },
      good: { text: 'Good', color: '#B2CEE5', scale: 1.2 },
      oops: { text: 'Oops...', color: '#4A4443', scale: 1.0 },
    };
    
    const config = textConfig[type];
    const t = this.add.text(x, y, config.text, {
      fontSize: '24px',
      color: config.color,
      fontFamily: 'sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(40);

    this.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      scale: config.scale,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy()
    });
  }

  private updateBabyExpression(type: 'perfect' | 'good' | 'oops') {
    if (this.babyTween) this.babyTween.stop();
    
    if (type === 'perfect' || type === 'good') {
      this.babyFace.setText('^v^');
      this.babyFace.setColor('#4a9fd8');
    } else {
      this.babyFace.setText('>_<');
      this.babyFace.setColor('#4A4443');
    }
    
    this.babyTween = this.tweens.add({
      targets: this.babyFace,
      scale: 1.2,
      yoyo: true,
      duration: 150,
      onComplete: () => {
        this.time.delayedCall(500, () => {
          if (!this.isPaused) {
            this.babyFace.setText('-_-');
            this.babyFace.setColor('#4A4443');
          }
        });
      }
    });
  }

  private spawnCollectibleDrop(track: 0 | 1) {
    // Requirements say: 每次成功后随机飘出1个音符奶滴图标
    // Random offset
    const store = useGameStore.getState();
    store.spawnNoteDrop();

    const x = track === 0 ? this.leftTrackX : this.rightTrackX;
    const drop = this.add.sprite(x + Phaser.Math.Between(-30, 30), this.hitY - 20, 'blue-drop');
    drop.setInteractive();
    drop.setDepth(48);
    
    // Float upwards slowly
    this.tweens.add({
      targets: drop,
      y: this.hitY - 150,
      x: drop.x + Phaser.Math.Between(-20, 20),
      duration: 2000,
      onComplete: () => drop.destroy()
    });

    // Fade out
    this.tweens.add({
      targets: drop,
      alpha: 0,
      delay: 1500,
      duration: 500
    });

    drop.on('pointerdown', () => {
      store.collectNoteDrop();
      
      // Feedback
      this.tweens.killTweensOf(drop);
      this.tweens.add({
        targets: drop,
        scale: 1.5,
        alpha: 0,
        duration: 200,
        onComplete: () => drop.destroy()
      });
      
      const t = this.add.text(drop.x, drop.y, '+1', { fontSize: '16px', color: '#B2CEE5' }).setOrigin(0.5);
      this.tweens.add({
        targets: t,
        y: t.y - 30,
        alpha: 0,
        duration: 500,
        onComplete: () => t.destroy()
      });

      const bubble = this.add.sprite(drop.x, drop.y - 30, 'pink-bubble').setScale(0.9);
      this.tweens.add({
        targets: bubble,
        x: 70,
        y: 70,
        alpha: 0.1,
        duration: 700,
        onComplete: () => bubble.destroy()
      });

    });
  }

  private createBottles() {
    const hitY = this.hitY;
    const bottleScale = 0.68;
    const bottleKey = this.textures.exists('bottle-hd') ? 'bottle-hd' : 'bottle';

    this.leftBottle = this.add.image(this.leftTrackX, hitY, bottleKey);
    this.leftBottle.setOrigin(0.5, 0.5);
    this.leftBottle.setScale(bottleScale);
    this.leftBottle.setDepth(28);

    this.rightBottle = this.add.image(this.rightTrackX, hitY, bottleKey);
    this.rightBottle.setOrigin(0.5, 0.5);
    this.rightBottle.setScale(bottleScale);
    this.rightBottle.setDepth(28);
  }

  private updateBottleLiquid(fullness: number) {
    // In this version we use a solid bottle image, 
    // so we don't manually draw the liquid rectangle anymore.
    // Alternatively, you could apply a tint or mask to the bottle to simulate liquid.
    // For now, we will leave it empty as the image is static.
  }

  private createBaby() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    this.babyFace = this.add.text(width / 2, height * 0.85 + this.contentOffsetY, '-_-', {
      fontSize: '48px',
      color: '#4A4443',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(26);
  }

  private startGame(runId: number) {
    this.isPlaying = true;
    this.isPaused = false;
    this.runId = runId;
    this.generateLevelData();
    // 开局喘息：推迟游戏时钟，而非推迟奶滴生成（后者会导致一出现就在底部）
    this.startTime = this.time.now + START_GRACE_MS;
    this.pauseTime = 0;
    this.pausedDuration = 0;
    
    // Play BGM（节奏关必播，不吃静音）
    if (this.bgm && !this.bgm.isPlaying) {
      this.bgm.play({ volume: 0.7 });
    } else if (this.bgm) {
      (this.bgm as Phaser.Sound.WebAudioSound).setSeek(0);
      (this.bgm as Phaser.Sound.WebAudioSound).setVolume(0.7);
    }
    
    // Clear old notes
    this.notes.forEach(n => { if (n.sprite) n.sprite.destroy(); });
    this.babyFace.setText('-_-');
    this.babyFace.setColor('#4A4443');
    console.log('Game Started');
  }

  private stopBgm() {
    if (!this.bgm) return;
    try {
      if (this.bgm.isPlaying || this.bgm.isPaused) {
        this.bgm.stop();
      }
    } catch {
      // ignore
    }
  }

  private stopGame() {
    this.isPlaying = false;
    this.isPaused = false;
    this.notes.forEach(n => { if (n.sprite) n.sprite.destroy(); });
    this.stopBgm();
    console.log('Game Stopped');
  }

  private pauseGame() {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    this.pauseTime = this.time.now;
    if (this.bgm && this.bgm.isPlaying) {
      this.bgm.pause();
    }
  }

  private resumeGame() {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this.pausedDuration += this.time.now - this.pauseTime;
    if (this.bgm && this.bgm.isPaused) {
      this.bgm.resume();
    }
  }

  private createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // 奶嘴添添：居中略偏上，留出底部奶瓶操作区
    const bgImage = this.add.image(width / 2, height * 0.46 + this.contentOffsetY, 'bg-game');
    bgImage.setOrigin(0.5);
    bgImage.setDepth(0);
    
    const scaleX = width / bgImage.width;
    const scaleY = (height * 0.62) / bgImage.height;
    bgImage.setScale(Math.max(scaleX, scaleY) * 0.92);
    
    const bg = this.add.graphics();
    bg.setDepth(1);
    bg.fillStyle(0xF9F6F0, 0.12);
    bg.fillRect(0, 0, width, height);
  }

  private applyPlayAreaLayout(hudHeight: number) {
    const hudH = Math.max(Math.round(hudHeight), 96);
    if (hudH === this.lastHudHeight) return;

    this.lastHudHeight = hudH;
    this.trackTopY = Math.min(hudH + TRACK_TOP_GAP, this.hitY - 80);
    this.redrawTracks();
  }

  private redrawTracks() {
    if (!this.trackGraphics) return;

    const leftX = this.leftTrackX;
    const rightX = this.rightTrackX;

    this.trackGraphics.clear();
    this.trackGraphics.lineStyle(2, 0x4a9fd8, 0.42);

    this.trackGraphics.beginPath();
    this.trackGraphics.moveTo(leftX, this.trackTopY);
    this.trackGraphics.lineTo(leftX, this.hitY);
    this.trackGraphics.strokePath();

    this.trackGraphics.beginPath();
    this.trackGraphics.moveTo(rightX, this.trackTopY);
    this.trackGraphics.lineTo(rightX, this.hitY);
    this.trackGraphics.strokePath();
  }

  private createTracks() {
    this.trackGraphics = this.add.graphics();
    this.trackGraphics.setDepth(16);
    this.redrawTracks();
  }
}