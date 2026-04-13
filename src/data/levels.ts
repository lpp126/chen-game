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

export const LEVELS: LevelConfig[] = [
  { levelId: 1, age: 1, title: '听，奶瓶里的摇篮曲', theme: '喝奶', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 10 } },
  { levelId: 2, age: 2, title: '摇摇晃晃向前冲', theme: '爬行学步', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 3, age: 3, title: '咿呀星语练习生', theme: '咿呀学语', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 4, age: 4, title: '积木云端城', theme: '搭积木', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 5, age: 5, title: '故事夜的萤光页', theme: '睡前故事', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 6, age: 6, title: '第一天上学啦', theme: '第一天上学', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 7, age: 7, title: '换牙小勇士', theme: '换牙', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 8, age: 8, title: '跳绳节拍器', theme: '跳绳/运动', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 9, age: 9, title: '作业迷雾破译', theme: '写作业', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 10, age: 10, title: '宠物日常守护', theme: '养宠物', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 11, age: 11, title: '舞台前心跳', theme: '第一次登台', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 12, age: 12, title: '朋友信号接收', theme: '交朋友', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 13, age: 13, title: '情绪天平', theme: '青春期烦恼', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 14, age: 14, title: '篮筐抛物线', theme: '篮球', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 15, age: 15, title: '偶像拼图日记', theme: '追星/偶像', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 16, age: 16, title: '高中时间盒', theme: '高中生活', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 17, age: 17, title: '艺考分岔路', theme: '选择艺考', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 18, age: 18, title: '成人礼拼图', theme: '成人礼', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 19, age: 19, title: '大学报到清单', theme: '大学报到', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 20, age: 20, title: '试镜倒计时', theme: '进入演艺圈', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 21, age: 21, title: '台词记忆室', theme: '第一次拍戏', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 22, age: 22, title: '热度管理局', theme: '爆款短剧', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 23, age: 23, title: '春晚倒数夜', theme: '登上春晚', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
  { levelId: 24, age: 24, title: '24岁生日会', theme: '生日会', coverImage: defaultCover, bgm: 'bgm-women', orangeSpawnConfig: { min: 5, max: 8 } },
];
