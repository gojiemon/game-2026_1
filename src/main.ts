import './style.css';
import Game from './game/Game';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Root element not found');
}

const canvas = document.createElement('canvas');
root.appendChild(canvas);

const game = new Game(canvas);
game.start();
