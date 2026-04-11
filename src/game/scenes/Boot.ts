import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { useGameStore } from '../../store/gameStore';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Load background and cover images
    this.load.image('bg-room', 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_65bcd67e-df05-473b-8f3f-d000739cbea5.jpg');
    this.load.image('bg-game', 'https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avy10ggvz4e8.png');
    this.load.image('bottle', 'https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avxqgb6iqjnk.png');
    
    // Load BGM placeholder
    // Here we use a placeholder since the actual MP3 isn't hosted, but this represents "我们"
    this.load.audio('bgm-women', 'https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avxq5ckc7klc.mp3');

    // Handle load errors gracefully
    this.load.on('loaderror', (fileObj: any) => {
      console.error('Failed to load asset:', fileObj.key);
      if (fileObj.type === 'image') {
        const g = this.add.graphics();
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        g.fillGradientStyle(0xFADCD9, 0xB2CEE5, 0xB2CEE5, 0xFADCD9);
        g.fillRect(0,0,w,h);
        g.generateTexture(fileObj.key, w, h);
        g.destroy();
      }
    });

    // Generate placeholder textures using Graphics
    const g = this.add.graphics();
    
    // Note / Milk drop (circular)
    g.fillStyle(0xB2CEE5, 1);
    g.fillCircle(30, 30, 30);
    g.generateTexture('note', 60, 60);
    g.clear();

    // Star/Collectable drop
    g.fillStyle(0xFADCD9, 1);
    g.fillCircle(20, 20, 20);
    g.generateTexture('milk-drop', 40, 40);
    g.clear();

    // 可以在这里生成更多所需的贴图
  }

  create() {
    this.scene.start('MainGame'); // Always jump to MainGame immediately, letting React control visibility
  }
}