import { io, Socket } from 'socket.io-client';
import type { GameState, GameAction } from '../types/game.types';

export interface LobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
}

export interface RoomConfig {
  enabledRules: {
    silence: boolean;
    customRule: boolean;
    stackDraw: boolean;
    stackSkip: boolean;
    slap: boolean;
    jumpIn: boolean;
    unoCall: boolean;
    offerCard: boolean;
  };
}

type SocketCallback = {
  onPlayersChanged?: (players: LobbyPlayer[]) => void;
  onRulesUpdated?: (rules: RoomConfig['enabledRules']) => void;
  onGameStarted?: (state: GameState, playerId: string) => void;
  onGameStateUpdated?: (state: GameState) => void;
  onError?: (message: string) => void;
  onDisconnected?: () => void;
};

class SocketService {
  private socket: Socket | null = null;
  private callbacks: SocketCallback = {};
  private _playerId: string | null = null;
  private _roomCode: string | null = null;
  private _isHost: boolean = false;

  get playerId() { return this._playerId; }
  get roomCode() { return this._roomCode; }
  get isHost() { return this._isHost; }
  get isConnected() { return this.socket?.connected ?? false; }

  connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl, {
        transports: ['websocket'],
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.callbacks.onDisconnected?.();
      });

      this.socket.on('player_joined', (data: { players: LobbyPlayer[] }) => {
        this.callbacks.onPlayersChanged?.(data.players);
      });

      this.socket.on('player_left', (data: { players: LobbyPlayer[] }) => {
        this.callbacks.onPlayersChanged?.(data.players);
      });

      this.socket.on('player_ready_changed', (data: { players: LobbyPlayer[] }) => {
        this.callbacks.onPlayersChanged?.(data.players);
      });

      this.socket.on('rules_updated', (data: { rules: RoomConfig['enabledRules'] }) => {
        this.callbacks.onRulesUpdated?.(data.rules);
      });

      this.socket.on('game_started', (data: { state: GameState; playerId: string }) => {
        this.callbacks.onGameStarted?.(data.state, data.playerId);
      });

      this.socket.on('game_state_updated', (data: { state: GameState }) => {
        this.callbacks.onGameStateUpdated?.(data.state);
      });

      this.socket.on('error', (data: { message: string }) => {
        this.callbacks.onError?.(data.message);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.emit('leave_room');
      this.socket.disconnect();
      this.socket = null;
    }
    this._playerId = null;
    this._roomCode = null;
    this._isHost = false;
  }

  setCallbacks(callbacks: SocketCallback) {
    this.callbacks = callbacks;
  }

  createRoom(playerName: string): Promise<{ code: string; playerId: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('create_room', { playerName }, (response: any) => {
        if (response.success) {
          this._playerId = response.playerId;
          this._roomCode = response.code;
          this._isHost = response.isHost;
          resolve({ code: response.code, playerId: response.playerId });
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  }

  joinRoom(code: string, playerName: string): Promise<{ playerId: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('join_room', { code, playerName }, (response: any) => {
        if (response.success) {
          this._playerId = response.playerId;
          this._roomCode = response.code;
          this._isHost = response.isHost;
          resolve({ playerId: response.playerId });
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }

  toggleReady() {
    if (this.socket && this._playerId) {
      this.socket.emit('toggle_ready', { playerId: this._playerId });
    }
  }

  updateRules(rules: RoomConfig['enabledRules']) {
    if (this.socket) {
      this.socket.emit('update_rules', { rules });
    }
  }

  startGame() {
    if (this.socket) {
      this.socket.emit('start_game');
    }
  }

  sendAction(action: Omit<GameAction, 'playerId'>) {
    if (this.socket && this._playerId) {
      this.socket.emit('game_action', { ...action, playerId: this._playerId });
    }
  }
}

export const socketService = new SocketService();
