import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Boot } from './game/scenes/Boot';
import { Game } from './game/scenes/Game';
import { GameOver } from './game/scenes/GameOver';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { GameOver as GameOverUI } from './components/GameOver';
import { HomeScreen } from './components/HomeScreen';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { PlaceholderLevelGame } from './components/PlaceholderLevelGame';
import { OrangeShopScreen } from './components/OrangeShopScreen';
import { Level2CrawlGame } from './components/Level2CrawlGame';
import { Level3JumpGame } from './components/Level3JumpGame';
import { Level4StackGame } from './components/Level4StackGame';
import { Level5PuzzleGame } from './components/Level5PuzzleGame';
import { Level6BagOrganizeGame } from './components/Level6BagOrganizeGame';
import { Level7NeonSparkGame } from './components/Level7NeonSparkGame';
import { Level8MorningRunGame } from './components/Level8MorningRunGame';
import { Level9HomeworkDecodeGame } from './components/Level9HomeworkDecodeGame';
import { Level10PetCareGame } from './components/Level10PetCareGame';
import { Level11SpotlightGame } from './components/Level11SpotlightGame';
import { Level12MatchFriendsGame } from './components/Level12MatchFriendsGame';
import { Level13BalanceGame } from './components/Level13BalanceGame';
import { Level15Match3Game } from './components/Level15Match3Game';
import { Level16ScheduleGame } from './components/Level16ScheduleGame';
import { Level17PathGame } from './components/Level17PathGame';
import { Level18SlidePuzzleGame } from './components/Level18SlidePuzzleGame';
import { Level19PackingGame } from './components/Level19PackingGame';
import { Level20MemoryGame } from './components/Level20MemoryGame';
import { Level21LinesGame } from './components/Level21LinesGame';
import { Level22MergeGame } from './components/Level22MergeGame';
import { Level23CountdownGame } from './components/Level23CountdownGame';
import { Level24BirthdayGame } from './components/Level24BirthdayGame';
import { Level25WordFunGame } from './components/Level25WordFunGame';
import { LevelIntroScreen } from './components/LevelIntroScreen';
import { GamePauseOverlay } from './components/GamePauseOverlay';
import { AssetLoadOverlay } from './components/AssetLoadOverlay';
import { useGameStore } from './store/gameStore';
import { FRESH, DESIGN_WIDTH, DESIGN_HEIGHT } from './utils/levelTheme';
import { setMenuBgmActive, unlockAudio } from './utils/audioManager';
import { prefetchLevel24Bgm, setLevel24BgmActive } from './utils/level24Bgm';
import { prefetchHomeCover } from './utils/homeCoverCache';
import { prefetchLevel1Bgm } from './utils/level1Bgm';
import { prefetchLevelAssets } from './utils/levelAssetCache';

export default function App() {
  const initialized = useRef(false);
  const [scale, setScale] = useState(1);
  const { status, currentLevelId, hydrateCloudSave } = useGameStore();

  useEffect(() => {
    const handleResize = () => {
      // visualViewport 更贴近手机浏览器真实可视区（含地址栏收起/展开）
      const vv = window.visualViewport;
      const viewW = vv?.width ?? window.innerWidth;
      const viewH = vv?.height ?? window.innerHeight;
      const scaleX = viewW / DESIGN_WIDTH;
      const scaleY = viewH / DESIGN_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    };
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // 首页封面优先完成后，再初始化 Phaser，避免启动抢带宽
  useEffect(() => {
    if (initialized.current) return;
    let cancelled = false;
    void prefetchHomeCover().finally(() => {
      if (cancelled || initialized.current) return;
      initialized.current = true;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        scene: [Boot, Game, GameOver],
        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        backgroundColor: FRESH.bg,
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false }
        }
      };

      const game = new Phaser.Game(config);
      (window as Window & { __ctxiangPhaser?: Phaser.Game }).__ctxiangPhaser = game;
    });

    return () => {
      cancelled = true;
      const g = (window as Window & { __ctxiangPhaser?: Phaser.Game }).__ctxiangPhaser;
      if (g) {
        g.destroy(true);
        (window as Window & { __ctxiangPhaser?: Phaser.Game }).__ctxiangPhaser = undefined;
        initialized.current = false;
      }
    };
  }, []);

  useEffect(() => {
    void hydrateCloudSave();
  }, [hydrateCloudSave]);

  useEffect(() => {
    const menuActive = status === 'home' || status === 'level_select';
    if (!menuActive) {
      setMenuBgmActive(false);
      return;
    }
    // 封面就绪后再播菜单 BGM
    if (status === 'home') {
      let alive = true;
      void prefetchHomeCover().then(() => {
        if (alive && useGameStore.getState().status === 'home') setMenuBgmActive(true);
      });
      return () => {
        alive = false;
      };
    }
    setMenuBgmActive(true);
  }, [status]);

  // 进入关卡流程即优先下载本关素材（玩法图 + 结算表情包）与必要 BGM
  useEffect(() => {
    if (!(status === 'level_intro' || status === 'start' || status === 'playing')) return;
    void prefetchLevelAssets(currentLevelId);
    if (currentLevelId === 1) void prefetchLevel1Bgm();
    if (currentLevelId === 24) void prefetchLevel24Bgm();
  }, [status, currentLevelId]);

  // 第 24 关：规则页无 BGM；游戏界面与结算页循环播放生日快乐曲
  useEffect(() => {
    const active =
      currentLevelId === 24 && (status === 'playing' || status === 'gameover');
    setLevel24BgmActive(active);
  }, [status, currentLevelId]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // transform:scale 不改变布局占位；外层用缩放后的宽高做外壳，避免手机浏览器裁成「上黑下半截」
  const frameW = DESIGN_WIDTH * scale;
  const frameH = DESIGN_HEIGHT * scale;

  return (
    <div className="relative w-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-black flex justify-center items-center">
      <div
        className="relative overflow-hidden shrink-0"
        style={{
          width: frameW,
          height: frameH
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: `${DESIGN_WIDTH}px`,
            height: `${DESIGN_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: FRESH.bgGrad
          }}
        >
        {/* Phaser Container */}
        <div id="game-container" className={`absolute inset-0 z-0 ${status === 'playing' && currentLevelId === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
        
        {/* React UI Overlays */}
        <HomeScreen />
        <LevelSelectScreen />
        <OrangeShopScreen />
        <LevelIntroScreen />
        <StartScreen />
        {status === 'playing' && currentLevelId === 1 && <HUD />}
        <Level2CrawlGame />
        <Level3JumpGame />
        <Level4StackGame />
        <Level5PuzzleGame />
        {status === 'playing' && currentLevelId === 6 && <Level6BagOrganizeGame />}
        {status === 'playing' && currentLevelId === 7 && <Level7NeonSparkGame />}
        {status === 'playing' && currentLevelId === 8 && <Level8MorningRunGame />}
        {status === 'playing' && currentLevelId === 9 && <Level9HomeworkDecodeGame />}
        {status === 'playing' && currentLevelId === 10 && <Level10PetCareGame />}
        {status === 'playing' && currentLevelId === 11 && <Level11SpotlightGame />}
        {status === 'playing' && currentLevelId === 12 && <Level12MatchFriendsGame />}
        {status === 'playing' && currentLevelId === 13 && <Level13BalanceGame />}
        {status === 'playing' && currentLevelId === 14 && <Level22MergeGame />}
        {status === 'playing' && currentLevelId === 15 && <Level15Match3Game />}
        {status === 'playing' && currentLevelId === 16 && <Level21LinesGame />}
        {status === 'playing' && currentLevelId === 17 && <Level17PathGame />}
        {status === 'playing' && currentLevelId === 18 && <Level18SlidePuzzleGame />}
        {status === 'playing' && currentLevelId === 19 && <Level19PackingGame />}
        {status === 'playing' && currentLevelId === 20 && <Level25WordFunGame />}
        {status === 'playing' && currentLevelId === 21 && <Level16ScheduleGame />}
        {status === 'playing' && currentLevelId === 22 && <Level20MemoryGame />}
        {status === 'playing' && currentLevelId === 23 && <Level23CountdownGame />}
        {status === 'playing' && currentLevelId === 24 && <Level24BirthdayGame />}
        <PlaceholderLevelGame />
        <GameOverUI />
        <div id="pause-root" className="absolute inset-0 z-[200] pointer-events-none" aria-hidden />
        <GamePauseOverlay />
        <AssetLoadOverlay />
        </div>
      </div>
    </div>
  );
}