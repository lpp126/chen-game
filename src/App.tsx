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
import { Level14BasketballGame } from './components/Level14BasketballGame';
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
import { LevelIntroScreen } from './components/LevelIntroScreen';
import { GamePauseOverlay } from './components/GamePauseOverlay';
import { useGameStore } from './store/gameStore';
import { FRESH } from './utils/levelTheme';

export default function App() {
  const initialized = useRef(false);
  const [scale, setScale] = useState(1);
  const { status, currentLevelId, hydrateCloudSave } = useGameStore();

  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 750;
      const scaleY = window.innerHeight / 1330;
      setScale(Math.min(scaleX, scaleY));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 750,
      height: 1330,
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

    return () => {
      game.destroy(true);
      initialized.current = false;
    };
  }, []);

  useEffect(() => {
    void hydrateCloudSave();
  }, [hydrateCloudSave]);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-black flex justify-center items-center">
      <div 
        className="relative overflow-hidden shrink-0"
        style={{
          width: '750px',
          height: '1330px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
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
        {status === 'playing' && currentLevelId === 14 && <Level14BasketballGame />}
        {status === 'playing' && currentLevelId === 15 && <Level15Match3Game />}
        {status === 'playing' && currentLevelId === 16 && <Level16ScheduleGame />}
        {status === 'playing' && currentLevelId === 17 && <Level17PathGame />}
        {status === 'playing' && currentLevelId === 18 && <Level18SlidePuzzleGame />}
        {status === 'playing' && currentLevelId === 19 && <Level19PackingGame />}
        {status === 'playing' && currentLevelId === 20 && <Level20MemoryGame />}
        {status === 'playing' && currentLevelId === 21 && <Level21LinesGame />}
        {status === 'playing' && currentLevelId === 22 && <Level22MergeGame />}
        {status === 'playing' && currentLevelId === 23 && <Level23CountdownGame />}
        {status === 'playing' && currentLevelId === 24 && <Level24BirthdayGame />}
        <PlaceholderLevelGame />
        <GameOverUI />
        <div id="pause-root" className="absolute inset-0 z-[200] pointer-events-none" aria-hidden />
        <GamePauseOverlay />
      </div>
    </div>
  );
}