import { useState } from 'react';
import { Button } from '../common/Button';
import type { GameConfig } from '../../types/game.types';

interface MainMenuProps {
  onStartGame: (config: GameConfig) => void;
}

export function MainMenu({ onStartGame }: MainMenuProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  const [gameMode, setGameMode] = useState<'local' | 'ai'>('local');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Spicy rules toggles
  const [rules, setRules] = useState({
    silence: true,
    customRule: true,
    stackDraw: true,
    stackSkip: true,
    slap: true,
    jumpIn: true,
    unoCall: true,
    offerCard: true,
  });

  const handleStartGame = () => {
    const config: GameConfig = {
      playerCount,
      playerNames: playerNames.slice(0, playerCount),
      enabledRules: rules,
      aiDifficulty: gameMode === 'ai' ? aiDifficulty : undefined,
    };
    onStartGame(config);
  };

  const toggleRule = (rule: keyof typeof rules) => {
    setRules((prev) => ({ ...prev, [rule]: !prev[rule] }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
            SPICY UNO
          </h1>
          <p className="text-gray-400 mt-2">The game with extra heat!</p>
        </div>

        {/* Game Mode */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">Game Mode</label>
          <div className="flex gap-4">
            <button
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                gameMode === 'local'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setGameMode('local')}
            >
              Local Multiplayer
            </button>
            <button
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                gameMode === 'ai'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setGameMode('ai')}
            >
              vs AI
            </button>
          </div>
        </div>

        {/* Player Count */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">Number of Players</label>
          <div className="flex gap-2">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  playerCount === count
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setPlayerCount(count)}
              >
                {count} Players
              </button>
            ))}
          </div>
        </div>

        {/* Player Names */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">Player Names</label>
          <div className="grid grid-cols-2 gap-3">
            {playerNames.slice(0, playerCount).map((name, index) => (
              <input
                key={index}
                type="text"
                value={name}
                onChange={(e) => {
                  const newNames = [...playerNames];
                  newNames[index] = e.target.value;
                  setPlayerNames(newNames);
                }}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={`Player ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* AI Difficulty */}
        {gameMode === 'ai' && (
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 font-medium">AI Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium capitalize transition-all ${
                    aiDifficulty === diff
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setAiDifficulty(diff)}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spicy Rules */}
        <div className="mb-8">
          <label className="block text-gray-300 mb-3 font-medium">Spicy Rules</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'silence', label: '7 = Silence', emoji: '🤫' },
              { key: 'customRule', label: '0 = Custom Rule', emoji: '📝' },
              { key: 'stackDraw', label: 'Stack +2/+4', emoji: '📚' },
              { key: 'stackSkip', label: 'Stack Skips', emoji: '⏭️' },
              { key: 'slap', label: '5 = Slap', emoji: '👋' },
              { key: 'jumpIn', label: 'Jump-in', emoji: '🦘' },
              { key: 'unoCall', label: 'Must Say UNO', emoji: '📢' },
              { key: 'offerCard', label: 'Offer Cards', emoji: '🎁' },
            ].map(({ key, label, emoji }) => (
              <button
                key={key}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                  rules[key as keyof typeof rules]
                    ? 'bg-green-600/80 text-white'
                    : 'bg-gray-700/50 text-gray-400'
                }`}
                onClick={() => toggleRule(key as keyof typeof rules)}
              >
                <span>{emoji}</span>
                <span>{label}</span>
                <span className="ml-auto">{rules[key as keyof typeof rules] ? '✓' : '✗'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <Button
          variant="success"
          size="lg"
          className="w-full text-xl py-4"
          onClick={handleStartGame}
        >
          Start Game
        </Button>
      </div>
    </div>
  );
}
