import { useState } from 'react';
import { MainMenu } from './components/lobby/MainMenu';
import { GameBoard } from './components/game/GameBoard';
import { OnlineLobby } from './components/lobby/OnlineLobby';
import { OnlineGameBoard } from './components/game/OnlineGameBoard';
import { useGameStore } from './stores/gameStore';
import type { GameConfig, GameState } from './types/game.types';
import type { AIDifficulty } from './ai/AIPlayer';

type GameScreen = 'menu' | 'game' | 'online-lobby' | 'online-game';

function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [onlineGameState, setOnlineGameState] = useState<GameState | null>(null);
  const [onlinePlayerId, setOnlinePlayerId] = useState<string | null>(null);
  const { startGame, gameState } = useGameStore();

  const handleStartGame = (config: GameConfig) => {
    if (config.aiDifficulty) {
      setAiDifficulty(config.aiDifficulty);
    }
    startGame(config);
    setScreen('game');
  };

  const handleOnlinePlay = () => {
    setScreen('online-lobby');
  };

  const handleOnlineGameStart = (state: GameState, playerId: string) => {
    setOnlineGameState(state);
    setOnlinePlayerId(playerId);
    setScreen('online-game');
  };

  const handleExitGame = () => {
    setScreen('menu');
    setOnlineGameState(null);
    setOnlinePlayerId(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {screen === 'menu' && (
        <MainMenu onStartGame={handleStartGame} onOnlinePlay={handleOnlinePlay} />
      )}
      {screen === 'game' && gameState && (
        <GameBoard onExitGame={handleExitGame} aiDifficulty={aiDifficulty} />
      )}
      {screen === 'online-lobby' && (
        <OnlineLobby onBack={handleExitGame} onGameStart={handleOnlineGameStart} />
      )}
      {screen === 'online-game' && onlineGameState && onlinePlayerId && (
        <OnlineGameBoard
          initialState={onlineGameState}
          playerId={onlinePlayerId}
          onExitGame={handleExitGame}
        />
      )}
    </div>
  );
}

export default App;
