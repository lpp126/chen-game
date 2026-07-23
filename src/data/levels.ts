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

const defaultCover = '/images/home-cover.webp';

export { defaultCover as LEVEL_DEFAULT_COVER };

export const LEVELS: LevelConfig[] = [
  { levelId: 1, age: 1, title: '摇篮奶曲', theme: '喂养 · 节拍', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 10 } },
  { levelId: 2, age: 2, title: '第一步探险', theme: '爬行迷宫', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 3, age: 3, title: '星星蹦床', theme: '积木跳跃', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 4, age: 4, title: '云端小塔', theme: '重力叠塔', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 5, age: 5, title: '萤光故事页', theme: '自由拼图 · 旋转', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 6, age: 6, title: '入学收纳', theme: '三消整理', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 7, age: 7, title: '数字合体', theme: '滑动合并 · 目标 512', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 8, age: 8, title: '课后移塔', theme: '汉诺塔 · 两小关', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 9, age: 9, title: '作业本冲刺', theme: '心算破译 · 比大小', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 10, age: 10, title: '熄灯计划', theme: '灯光翻转谜题', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 11, age: 11, title: '眼力大作战', theme: '找出隐藏数字', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 12, age: 12, title: '同桌记忆', theme: '翻牌配对', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 13, age: 13, title: '对岸少年', theme: '搭桥过河 + 折线逃生', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 14, age: 14, title: '闪光反应', theme: '速度反应训练', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 15, age: 15, title: '竞赛二十四点', theme: '四则凑 24', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 16, age: 16, title: '分心捕手', theme: '底板 · 字色 · 字义', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 17, age: 17, title: '人群识谎', theme: '线索调查 · 指认', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 18, age: 18, title: '门锁四码', theme: 'AB 推理猜数', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 19, age: 19, title: '叠高一层', theme: '飘移精准叠楼', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 20, age: 20, title: '梗图夜话', theme: '谐音对照 + emoji 成语', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 21, age: 21, title: '夜灯数独', theme: '四格逻辑填数', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 22, age: 22, title: '试镜倒计时', theme: '记忆序列复现', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 23, age: 23, title: '色差分毫', theme: '观察力 · 递增网格', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 24, age: 24, title: '二十四烛光', theme: '见缝插烛 · 庆生', coverImage: defaultCover, bgm: 'bgm-happybirthday', orangeSpawnConfig: { min: 5, max: 8 } },
];
