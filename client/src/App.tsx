import { useState } from 'react';
import { MainMenu } from './components/lobby/MainMenu';
import { GameBoard } from './components/game/GameBoard';
import { useGameStore } from './stores/gameStore';
import type { GameConfig } from './types/game.types';

type GameScreen = 'menu' | 'game';

function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const { startGame, gameState } = useGameStore();

  const handleStartGame = (config: GameConfig) => {
    startGame(config);
    setScreen('game');
  };

  const handleExitGame = () => {
    setScreen('menu');
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {screen === 'menu' && <MainMenu onStartGame={handleStartGame} />}
      {screen === 'game' && gameState && <GameBoard onExitGame={handleExitGame} />}
    </div>
  );
}

export default App;
