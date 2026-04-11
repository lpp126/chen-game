import { Scene } from 'phaser';

export class GameOver extends Scene {
  constructor() {
    super('GameOver');
  }

  create() {
    // This scene runs behind the React GameOver UI.
    // It basically does nothing but wait for a signal to restart.
  }
}