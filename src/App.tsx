import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Boot } from './game/scenes/Boot';
import { Game } from './game/scenes/Game';
import { GameOver } from './game/scenes/GameOver';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { GameOver as GameOverUI } from './components/GameOver';
import { SootheScreen } from './components/SootheScreen';
import { HomeScreen } from './components/HomeScreen';
import { LevelSelectScreen } from './components/LevelSelectScreen';

export default function App() {
  const initialized = useRef(false);
  const [scale, setScale] = useState(1);

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
        mode: Phaser.Scale.FIT,
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
        <div id="game-container" className="absolute inset-0 z-0" />
        
        {/* React UI Overlays */}
        <HomeScreen />
        <LevelSelectScreen />
        <StartScreen />
        <HUD />
        <SootheScreen />
        <GameOverUI />
      </div>
    </div>
  );
}