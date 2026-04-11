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
  const [dimensions, setDimensions] = useState({ scale: 1, width: 750, height: 1330 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 750;
      const targetHeight = Math.round(window.innerHeight / scaleX);
      setDimensions({ scale: scaleX, width: 750, height: targetHeight });
      setIsReady(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isReady || initialized.current) return;
    initialized.current = true;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: dimensions.width,
      height: dimensions.height,
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
  }, [isReady, dimensions.width, dimensions.height]);

  if (!isReady) return null;

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-black">
      <div 
        className="absolute top-0 left-0 bg-[#F9F6F0] overflow-hidden origin-top-left"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          transform: `scale(${dimensions.scale})`
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