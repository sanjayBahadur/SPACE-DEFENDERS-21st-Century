import Phaser from 'phaser';
import './style.css';
import { Boot } from './scenes/Boot';
import { Strategic } from './scenes/Strategic';
import { Tactical } from './scenes/Tactical';
import { MainMenu } from './scenes/MainMenu';
import { Credits } from './scenes/Credits';
import { PauseScene } from './scenes/PauseScene';
import { HandTracker } from './services/HandTracker';

// Initialize HandTracker
const handTracker = new HandTracker();
// Start tracking immediately (camera permissions will be requested)
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720, // 16:9 ratio
  parent: 'app',
  dom: {
    createContainer: true
  },
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  // Boot scene launches the others
  scene: [Boot, MainMenu, Strategic, Tactical, Credits, PauseScene],
  callbacks: {
    postBoot: (gameInstance) => {
      // Expose tracker to scenes via registry
      gameInstance.registry.set('handTracker', handTracker);
    }
  }
};

const game = new Phaser.Game(config);

// Start tracking immediately (camera permissions will be requested)
handTracker.init().then(() => {
  console.log('HandTracker initialized');
}).catch(err => {
  console.error('HandTracker failed to initialize - Falling back to Keyboard Mode', err);
  // Auto-enable Keyboard Mode if camera fails
  game.registry.set('keyboardMode', true);
  game.registry.set('manualKeyboardOverride', true);
});
