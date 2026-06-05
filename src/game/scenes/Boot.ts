import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Load background and cover images
    this.load.image('bg-room', 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_65bcd67e-df05-473b-8f3f-d000739cbea5.jpg');
    this.load.image('bg-game', '/images/奶嘴添添.png');
    // 奶瓶优先本地生成，避免 CDN 失败导致游戏中不可见
    this.load.image('bottle-hd', 'https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avxqgb6iqjnk.png');
    
    // Load BGM placeholder
    // Here we use a placeholder since the actual MP3 isn't hosted, but this represents "我们"
    this.load.audio('bgm-women', 'https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avxq5ckc7klc.mp3');

    // Handle load errors gracefully
    this.load.on('loaderror', (fileObj: { key?: string; type?: string }) => {
      console.error('Failed to load asset:', fileObj.key);
    });

    // Generate placeholder textures using Graphics
    const g = this.add.graphics();

    // 奶瓶（本地贴图，保证离线/内置浏览器也能显示）
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
    
    // Note / Milk drop (circular)
    g.fillStyle(0xB2CEE5, 1);
    g.fillCircle(30, 30, 30);
    g.generateTexture('note', 60, 60);
    g.clear();

    // Blue milk drop
    g.fillStyle(0x6ba8ff, 1);
    g.fillCircle(20, 20, 20);
    g.generateTexture('blue-drop', 40, 40);
    g.clear();

    // Pink bubble for task progress
    g.fillStyle(0xF8A7D8, 1);
    g.fillCircle(16, 16, 16);
    g.generateTexture('pink-bubble', 32, 32);
    g.clear();

    // 可以在这里生成更多所需的贴图
  }

  create() {
    this.scene.start('MainGame'); // Always jump to MainGame immediately, letting React control visibility
  }
}