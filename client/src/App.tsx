import { useState } from 'react';
import { MainMenu } from './components/lobby/MainMenu';
import { GameBoard } from './components/game/GameBoard';
import { useGameStore } from './stores/gameStore';
import type { GameConfig } from './types/game.types';
import type { AIDifficulty } from './ai/AIPlayer';

type GameScreen = 'menu' | 'game';

function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const { startGame, gameState } = useGameStore();

  const handleStartGame = (config: GameConfig) => {
    if (config.aiDifficulty) {
      setAiDifficulty(config.aiDifficulty);
    }
    startGame(config);
    setScreen('game');
  };

  const handleExitGame = () => {
    setScreen('menu');
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {screen === 'menu' && <MainMenu onStartGame={handleStartGame} />}
      {screen === 'game' && gameState && (
        <GameBoard onExitGame={handleExitGame} aiDifficulty={aiDifficulty} />
      )}
    </div>
  );
}

export default App;
