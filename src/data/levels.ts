export interface LevelConfig {
  levelId: number;
  age: number;
  title: string;
  theme: string;
  coverImage: string;
  bgm: string;
  orangeSpawnConfig: {
    min: number;
    max: number;
  };
}

const defaultCover =
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_65bcd67e-df05-473b-8f3f-d000739cbea5.jpg';

export { defaultCover as LEVEL_DEFAULT_COVER };

export const LEVELS: LevelConfig[] = [
  { levelId: 1, age: 1, title: '听，奶瓶里的摇篮曲', theme: '喝奶', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 10 } },
  { levelId: 2, age: 2, title: '摇摇晃晃向前冲', theme: '爬行学步', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 3, age: 3, title: '积木世界快乐跳跃', theme: '竖屏平台跳跃', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 4, age: 4, title: '积木云端城', theme: '搭积木', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 5, age: 5, title: '故事夜的萤光页', theme: '睡前故事', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 6, age: 6, title: '第一天上学啦', theme: '第一天上学', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 7, age: 7, title: '数字华容道', theme: '数字逻辑 · 思维训练', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 8, age: 8, title: '汉诺塔', theme: '经典逻辑 · 移盘', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 9, age: 9, title: '作业迷雾破译', theme: '写作业', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 10, age: 10, title: '点灯小游戏', theme: '逻辑翻转', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 11, age: 11, title: '找不同', theme: '观察 · 找茬', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 12, age: 12, title: '同桌连线', theme: '记忆配对', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 13, age: 13, title: '接水管', theme: '旋转连通', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 14, age: 14, title: '比大小', theme: '心算比较', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 15, age: 15, title: '速算24点', theme: '四则运算', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 16, age: 16, title: '四格数独', theme: '逻辑填数 · 冲突提示', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 17, age: 17, title: '规律推理', theme: '找规律', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 18, age: 18, title: '数字转盘锁', theme: '线索解谜', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 19, age: 19, title: '飘移叠楼', theme: '精准叠放', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 20, age: 20, title: '镜头倒数', theme: '记忆序列', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 21, age: 21, title: '台词排句', theme: '语序排列', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 22, age: 22, title: '一笔连点', theme: '路径规划', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 23, age: 23, title: '色差辨识', theme: '观察力', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 24, age: 24, title: '蛋糕制作', theme: '顺序排列', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
];
