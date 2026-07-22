import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 首页优先：不在启动时拉取第 1 关 3MB+ BGM，改到进入第 1 关再加载
    this.load.image('bg-room', '/images/bg-room.webp');
    this.load.image('bg-game', '/images/奶嘴添添.webp');
    this.load.image('bottle-hd', '/images/bottle-hd.webp');

    this.load.on('loaderror', (fileObj: { key?: string; type?: string }) => {
      console.error('Failed to load asset:', fileObj.key);
    });

    const g = this.add.graphics();

    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(18, 36, 64, 108, 18);
    g.fillStyle(0xfadcd9, 0.75);
    g.fillRoundedRect(26, 58, 48, 72, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(32, 8, 36, 36, 10);
    g.lineStyle(3, 0xe9c4c0, 1);
    g.strokeRoundedRect(18, 36, 64, 108, 18);
    g.generateTexture('bottle', 100, 152);
    g.clear();

    g.fillStyle(0xb2cee5, 1);
    g.fillCircle(30, 30, 30);
    g.generateTexture('note', 60, 60);
    g.clear();

    g.fillStyle(0x6ba8ff, 1);
    g.fillCircle(20, 20, 20);
    g.generateTexture('blue-drop', 40, 40);
    g.clear();

    g.fillStyle(0xf8a7d8, 1);
    g.fillCircle(16, 16, 16);
    g.generateTexture('pink-bubble', 32, 32);
    g.clear();
  }

  create() {
    this.scene.start('MainGame');
  }
}
