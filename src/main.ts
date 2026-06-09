import { Game } from './core/Game';

const initGame = async () => {
  const game = new Game();
  await game.bootstrap();
};

window.addEventListener('DOMContentLoaded', () => {
  initGame().catch(console.error);
});
