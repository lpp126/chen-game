# 24帧人生

一款竖屏小游戏：跟随主人公从 1 岁到 24 岁，用 24 关小玩法串起一条成长故事线。

技术栈：React + Vite + Phaser（仅第 1 关）+ Tailwind。

## 环境要求

- Node.js 18+（推荐 20）
- npm 9+

## 快速开始

```bash
cd app-avx47of1d0ch
npm install
npm run dev
```

浏览器打开终端里提示的本地地址（一般是 `http://localhost:5173`）。

### 构建静态站

```bash
npm run build
npm run preview
```

产物在 `dist/`，可部署到任意静态托管。

## 玩法说明

- 首页 → 选关 → 开场文案 → 开始页规则 → 进入关卡
- 通关按星级结算橙子；默认进度在**本机浏览器** `localStorage`
- 首页点「进入游戏」后需先用**昵称 + 密码**登录，再进入选关；配置 Supabase 后可跨设备同步
- 选关页可点昵称切换存档
- 关卡需按解锁进度进入（管理员模式除外）
- 右上角 🔊 / 🔇 可全局静音（菜单 BGM、关卡音效、第 1 关 BGM 都会生效）

## 昵称 + 密码云存档（可选）

1. 创建 [Supabase](https://supabase.com) 项目  
2. 在 SQL Editor 执行仓库内 `supabase/player_saves.sql`  
3. 在 `.env` 写入：

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

4. 重新 `npm run build` 并部署  

未配置时：同步功能仍可用，但进度只按昵称存在当前浏览器。

## 资源目录

| 路径 | 用途 |
|------|------|
| `public/audio/menu-bgm.mp3` | 首页 / 选关循环 BGM |
| `public/audio/level1-bgm.mp3` | 第 1 关 Phaser BGM |
| `public/images/` | 封面、结算表情包、关卡图（已压缩为 WebP） |

素材体积已优化：图片约 54MB → ~2MB，音频约 9MB → ~4MB。若新增原图，可运行：

```bash
npm run optimize:assets
```

注意：该命令会把 `public/images` 下 png/jpg **转成 webp 并删除原图**，同时需同步更新代码路径。

## 开发备注

- 设计稿基准分辨率：`750 × 1334`，页面按窗口等比缩放
- `vite.config.ts` 为纯 Vite 配置，不含平台注入插件
- 可选环境变量见 `.env.example`（当前主流程不依赖）

## License

请在公开仓库时自行补充许可证（如 MIT）。
