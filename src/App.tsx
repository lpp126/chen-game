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
import { LevelIntroScreen } from './components/LevelIntroScreen';
import { useGameStore } from './store/gameStore';

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
      backgroundColor: '#F9F6F0',
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
        className="relative bg-[#F9F6F0] overflow-hidden shrink-0"
        style={{
          width: '750px',
          height: '1330px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
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
        <HUD />
        <Level2CrawlGame />
        <Level3JumpGame />
        <Level4StackGame />
        <PlaceholderLevelGame />
        <GameOverUI />
      </div>
    </div>
  );
}