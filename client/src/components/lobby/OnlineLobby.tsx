import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../common/Button';
import { socketService, type LobbyPlayer, type RoomConfig } from '../../multiplayer/socketService';
import type { GameState } from '../../types/game.types';

interface OnlineLobbyProps {
  onBack: () => void;
  onGameStart: (state: GameState, playerId: string) => void;
}

type LobbyState = 'connect' | 'menu' | 'create' | 'join' | 'waiting';

export function OnlineLobby({ onBack, onGameStart }: OnlineLobbyProps) {
  const [lobbyState, setLobbyState] = useState<LobbyState>('connect');
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [rules, setRules] = useState<RoomConfig['enabledRules']>({
    silence: true,
    customRule: true,
    stackDraw: true,
    stackSkip: true,
    slap: true,
    jumpIn: true,
    unoCall: true,
    offerCard: true,
  });

  // Set up socket callbacks
  useEffect(() => {
    socketService.setCallbacks({
      onPlayersChanged: (newPlayers) => setPlayers(newPlayers),
      onRulesUpdated: (newRules) => setRules(newRules),
      onGameStarted: (state, playerId) => {
        onGameStart(state, playerId);
      },
      onError: (message) => setError(message),
      onDisconnected: () => {
        setLobbyState('connect');
        setError('Disconnected from server');
      },
    });

    return () => {
      socketService.disconnect();
    };
  }, [onGameStart]);

  const handleConnect = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await socketService.connect(serverUrl);
      setLobbyState('menu');
    } catch (err) {
      setError('Could not connect to server. Make sure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const result = await socketService.createRoom(playerName.trim());
      setRoomCode(result.code);
      setPlayers([{ id: result.playerId, name: playerName.trim(), ready: false }]);
      setLobbyState('waiting');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter room code');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await socketService.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      setLobbyState('waiting');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleReady = () => {
    socketService.toggleReady();
  };

  const handleStartGame = () => {
    socketService.startGame();
  };

  const handleRuleToggle = (rule: keyof RoomConfig['enabledRules']) => {
    if (!socketService.isHost) return;
    const newRules = { ...rules, [rule]: !rules[rule] };
    setRules(newRules);
    socketService.updateRules(newRules);
  };

  const handleBack = useCallback(() => {
    socketService.disconnect();
    if (lobbyState === 'waiting') {
      setLobbyState('menu');
    } else if (lobbyState === 'create' || lobbyState === 'join') {
      setLobbyState('menu');
    } else if (lobbyState === 'menu') {
      setLobbyState('connect');
    } else {
      onBack();
    }
    setError(null);
  }, [lobbyState, onBack]);

  const currentPlayer = players.find(p => p.id === socketService.playerId);
  const allReady = players.length >= 2 && players.every(p => p.ready);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        className="bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Connect to Server */}
        {lobbyState === 'connect' && (
          <>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Connect to Server</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Server Address</label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:3001"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Enter the host's IP address and port
                </p>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={onBack} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Menu - Create or Join */}
        {lobbyState === 'menu' && (
          <>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Online Play</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <Button
                variant="primary"
                onClick={() => { setError(null); setLobbyState('create'); handleCreateRoom(); }}
                disabled={!playerName.trim()}
                className="w-full"
              >
                Create Room
              </Button>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-600" />
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 h-px bg-gray-600" />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  maxLength={4}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-center text-2xl tracking-widest"
                />
              </div>

              <Button
                variant="success"
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !roomCode.trim()}
                className="w-full"
              >
                Join Room
              </Button>

              <Button variant="secondary" onClick={handleBack} className="w-full">
                Back
              </Button>
            </div>
          </>
        )}

        {/* Waiting Room */}
        {lobbyState === 'waiting' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Room Code</h2>
              <motion.div
                className="text-5xl font-bold text-purple-400 tracking-widest mt-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                {socketService.roomCode}
              </motion.div>
              <p className="text-gray-500 text-sm mt-2">Share this code with friends</p>
            </div>

            {/* Players List */}
            <div className="space-y-2 mb-6">
              <h3 className="text-gray-400 text-sm">Players ({players.length}/8)</h3>
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between bg-gray-700 rounded-lg px-4 py-3 ${
                    player.id === socketService.playerId ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{player.name}</span>
                    {player.id === socketService.playerId && (
                      <span className="text-xs text-purple-400">(You)</span>
                    )}
                  </div>
                  <span className={`text-sm ${player.ready ? 'text-green-400' : 'text-gray-500'}`}>
                    {player.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              ))}
            </div>

            {/* Rules (host only) */}
            {socketService.isHost && (
              <div className="mb-6">
                <h3 className="text-gray-400 text-sm mb-2">Spicy Rules</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(rules).map(([key, enabled]) => (
                    <button
                      key={key}
                      onClick={() => handleRuleToggle(key as keyof typeof rules)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        enabled
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {formatRuleName(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm text-center mb-4">{error}</p>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant={currentPlayer?.ready ? 'secondary' : 'success'}
                onClick={handleToggleReady}
                className="w-full"
              >
                {currentPlayer?.ready ? 'Not Ready' : "I'm Ready!"}
              </Button>

              {socketService.isHost && (
                <Button
                  variant="primary"
                  onClick={handleStartGame}
                  disabled={!allReady}
                  className="w-full"
                >
                  {allReady ? 'Start Game' : `Waiting for players... (${players.filter(p => p.ready).length}/${players.length})`}
                </Button>
              )}

              <Button variant="secondary" onClick={handleBack} className="w-full">
                Leave Room
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function formatRuleName(key: string): string {
  const names: Record<string, string> = {
    silence: '7 = Silence',
    customRule: '0 = Custom',
    stackDraw: 'Stack +2/+4',
    stackSkip: 'Stack Skips',
    slap: '5 = Slap',
    jumpIn: 'Jump In',
    unoCall: 'Call UNO',
    offerCard: 'Offer Cards',
  };
  return names[key] || key;
}
