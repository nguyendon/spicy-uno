import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Types (simplified from client)
type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
type CardValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';

interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  hasCalledUno: boolean;
  isConnected: boolean;
  socketId: string;
}

interface GameState {
  id: string;
  phase: 'waiting' | 'playing' | 'color_selection' | 'slap_race' | 'custom_rule_creation' | 'card_request' | 'offering_card' | 'game_over';
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  drawPile: Card[];
  discardPile: Card[];
  pendingAction: any;
  customRules: any[];
  silenceMode: boolean;
  stackedDrawAmount: number;
  turnStartTime: number;
  winner: string | null;
  selectedWildColor: CardColor | null;
}

interface Room {
  code: string;
  hostId: string;
  players: Map<string, { id: string; name: string; socketId: string; ready: boolean }>;
  gameState: GameState | null;
  config: {
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
  };
}

// Server setup
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>(); // socketId -> roomCode

// Generate a 4-letter room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

// Create a deck of cards
function createDeck(): Card[] {
  const colors: CardColor[] = ['red', 'yellow', 'green', 'blue'];
  const cards: Card[] = [];

  // Number cards (0-9, one 0 per color, two of each 1-9)
  for (const color of colors) {
    cards.push({ id: uuidv4(), color, value: 0 });
    for (let i = 1; i <= 9; i++) {
      cards.push({ id: uuidv4(), color, value: i as CardValue });
      cards.push({ id: uuidv4(), color, value: i as CardValue });
    }
    // Action cards (2 each)
    for (const action of ['skip', 'reverse', 'draw2'] as CardValue[]) {
      cards.push({ id: uuidv4(), color, value: action });
      cards.push({ id: uuidv4(), color, value: action });
    }
  }

  // Wild cards (4 each)
  for (let i = 0; i < 4; i++) {
    cards.push({ id: uuidv4(), color: 'wild', value: 'wild' });
    cards.push({ id: uuidv4(), color: 'wild', value: 'wild_draw4' });
  }

  return shuffle(cards);
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Initialize game state
function initializeGame(room: Room): GameState {
  const deck = createDeck();
  const players: Player[] = [];

  // Deal 7 cards to each player
  for (const [id, player] of room.players) {
    players.push({
      id,
      name: player.name,
      hand: deck.splice(0, 7),
      hasCalledUno: false,
      isConnected: true,
      socketId: player.socketId,
    });
  }

  // Find a valid starting card (not wild, not action)
  let startCardIndex = deck.findIndex(c => c.color !== 'wild' && typeof c.value === 'number');
  if (startCardIndex === -1) startCardIndex = 0;
  const startCard = deck.splice(startCardIndex, 1)[0];

  return {
    id: room.code,
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    direction: 1,
    drawPile: deck,
    discardPile: [startCard],
    pendingAction: null,
    customRules: [],
    silenceMode: false,
    stackedDrawAmount: 0,
    turnStartTime: Date.now(),
    winner: null,
    selectedWildColor: null,
  };
}

// Get the top discard card
function getTopCard(state: GameState): Card {
  return state.discardPile[state.discardPile.length - 1];
}

// Check if a card can be played
function canPlayCard(state: GameState, card: Card): boolean {
  const topCard = getTopCard(state);
  const effectiveColor = state.selectedWildColor || topCard.color;

  // Wild cards can always be played
  if (card.color === 'wild') return true;

  // Match color
  if (card.color === effectiveColor) return true;

  // Match value
  if (card.value === topCard.value) return true;

  return false;
}

// Get valid moves for a player
function getValidMoves(state: GameState, playerId: string): Card[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  // If there's stacked draw, only +2/+4 cards can be played
  if (state.stackedDrawAmount > 0) {
    return player.hand.filter(c => c.value === 'draw2' || c.value === 'wild_draw4');
  }

  return player.hand.filter(c => canPlayCard(state, c));
}

// Advance to next player
function nextPlayer(state: GameState, skip = 0): number {
  let next = state.currentPlayerIndex;
  for (let i = 0; i <= skip; i++) {
    next = (next + state.direction + state.players.length) % state.players.length;
  }
  return next;
}

// Draw cards from pile
function drawCards(state: GameState, count: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (state.drawPile.length === 0) {
      // Reshuffle discard pile
      const topCard = state.discardPile.pop()!;
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [topCard];
    }
    if (state.drawPile.length > 0) {
      cards.push(state.drawPile.pop()!);
    }
  }
  return cards;
}

// Handle game actions
function handleAction(room: Room, action: any): void {
  const state = room.gameState;
  if (!state || state.phase === 'game_over') return;

  const { type, playerId } = action;
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const player = state.players[playerIndex];

  if (!player) return;

  switch (type) {
    case 'play_card': {
      const { cardId, wildColor } = action;
      const cardIndex = player.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      const card = player.hand[cardIndex];

      // Validate it's player's turn (unless jump-in)
      if (state.currentPlayerIndex !== playerIndex) {
        // Check for jump-in
        if (room.config.enabledRules.jumpIn) {
          const topCard = getTopCard(state);
          if (card.color === topCard.color && card.value === topCard.value) {
            // Valid jump-in
            player.hand.splice(cardIndex, 1);
            state.discardPile.push(card);
            state.currentPlayerIndex = playerIndex;
            state.selectedWildColor = null;
            state.turnStartTime = Date.now();

            // Check win
            if (player.hand.length === 0) {
              state.phase = 'game_over';
              state.winner = playerId;
            } else {
              state.currentPlayerIndex = nextPlayer(state);
            }
            return;
          }
        }
        return;
      }

      // Validate card can be played
      if (!canPlayCard(state, card) && state.stackedDrawAmount === 0) return;

      // Play the card
      player.hand.splice(cardIndex, 1);
      state.discardPile.push(card);

      // Handle wild color
      if (card.color === 'wild') {
        state.selectedWildColor = wildColor || null;
        if (!wildColor) {
          state.phase = 'color_selection';
          return;
        }
      } else {
        state.selectedWildColor = null;
      }

      // Check win
      if (player.hand.length === 0) {
        state.phase = 'game_over';
        state.winner = playerId;
        return;
      }

      // Apply card effects
      applyCardEffects(room, card, playerIndex);
      break;
    }

    case 'draw_card': {
      if (state.currentPlayerIndex !== playerIndex) return;

      // Draw stacked amount or 1
      const amount = state.stackedDrawAmount > 0 ? state.stackedDrawAmount : 1;
      const cards = drawCards(state, amount);
      player.hand.push(...cards);
      state.stackedDrawAmount = 0;

      // Move to next player
      state.currentPlayerIndex = nextPlayer(state);
      state.turnStartTime = Date.now();
      player.hasCalledUno = false;
      break;
    }

    case 'select_color': {
      if (state.phase !== 'color_selection') return;
      state.selectedWildColor = action.wildColor;
      state.phase = 'playing';
      state.currentPlayerIndex = nextPlayer(state);
      state.turnStartTime = Date.now();
      break;
    }

    case 'call_uno': {
      if (player.hand.length <= 2) {
        player.hasCalledUno = true;
      }
      break;
    }

    case 'catch_uno': {
      const target = state.players.find(p => p.id === action.targetPlayerId);
      if (target && target.hand.length === 1 && !target.hasCalledUno) {
        const cards = drawCards(state, 2);
        target.hand.push(...cards);
      }
      break;
    }

    case 'slap': {
      if (state.phase !== 'slap_race') return;
      // Simple: first to slap wins, last gets penalty
      // For now, just end slap race
      state.phase = 'playing';
      state.pendingAction = null;
      break;
    }

    case 'create_custom_rule': {
      if (state.phase !== 'custom_rule_creation') return;
      state.customRules.push({
        id: uuidv4(),
        text: action.customRule.text,
        type: action.customRule.type,
        createdBy: playerId,
        createdAt: Date.now(),
      });
      state.phase = 'playing';
      state.currentPlayerIndex = nextPlayer(state);
      state.turnStartTime = Date.now();
      break;
    }

    case 'report_speaking': {
      if (!state.silenceMode) return;
      const target = state.players.find(p => p.id === action.targetPlayerId);
      if (target) {
        const cards = drawCards(state, 1);
        target.hand.push(...cards);
      }
      break;
    }

    case 'request_card': {
      if (!room.config.enabledRules.offerCard) return;
      const target = state.players.find(p => p.id === action.targetPlayerId);
      if (!target || target.hand.length === 0) return;

      state.phase = 'card_request';
      state.pendingAction = {
        type: 'card_request',
        requesterId: playerId,
        targetPlayer: action.targetPlayerId,
      };
      break;
    }

    case 'decline_request': {
      if (state.phase !== 'card_request') return;
      if (state.pendingAction?.targetPlayer !== playerId) return;
      state.phase = 'playing';
      state.pendingAction = null;
      break;
    }

    case 'offer_card': {
      if (state.phase !== 'card_request') return;
      if (state.pendingAction?.targetPlayer !== playerId) return;

      const requesterId = state.pendingAction.requesterId;
      state.phase = 'offering_card';
      state.pendingAction = {
        type: 'offer_decision',
        offererId: playerId,
        targetPlayer: requesterId,
        offeredCardId: action.cardId,
        requesterId,
      };
      break;
    }

    case 'accept_offer': {
      if (state.phase !== 'offering_card') return;
      if (!state.pendingAction) return;

      const { offererId, offeredCardId, targetPlayer } = state.pendingAction;
      const offerer = state.players.find(p => p.id === offererId);
      const target = state.players.find(p => p.id === targetPlayer);

      if (!offerer || !target) return;

      const cardIndex = offerer.hand.findIndex(c => c.id === offeredCardId);
      if (cardIndex === -1) return;

      const card = offerer.hand.splice(cardIndex, 1)[0];
      target.hand.push(card);

      state.phase = 'playing';
      state.pendingAction = null;
      break;
    }

    case 'decline_offer': {
      if (state.phase !== 'offering_card') return;
      state.phase = 'playing';
      state.pendingAction = null;
      break;
    }
  }
}

function applyCardEffects(room: Room, card: Card, playerIndex: number): void {
  const state = room.gameState!;
  const config = room.config.enabledRules;

  switch (card.value) {
    case 'skip':
      if (config.stackSkip) {
        // Could implement skip stacking here
      }
      state.currentPlayerIndex = nextPlayer(state, 1);
      break;

    case 'reverse':
      if (state.players.length === 2) {
        state.currentPlayerIndex = nextPlayer(state, 1);
      } else {
        state.direction *= -1;
        state.currentPlayerIndex = nextPlayer(state);
      }
      break;

    case 'draw2':
      if (config.stackDraw) {
        state.stackedDrawAmount += 2;
      } else {
        const nextIdx = nextPlayer(state);
        const cards = drawCards(state, 2);
        state.players[nextIdx].hand.push(...cards);
        state.currentPlayerIndex = nextPlayer(state, 1);
      }
      state.currentPlayerIndex = nextPlayer(state);
      break;

    case 'wild_draw4':
      if (config.stackDraw) {
        state.stackedDrawAmount += 4;
      } else {
        const nextIdx = nextPlayer(state);
        const cards = drawCards(state, 4);
        state.players[nextIdx].hand.push(...cards);
        state.currentPlayerIndex = nextPlayer(state, 1);
      }
      state.currentPlayerIndex = nextPlayer(state);
      break;

    case 7:
      if (config.silence) {
        state.silenceMode = !state.silenceMode;
      }
      state.currentPlayerIndex = nextPlayer(state);
      break;

    case 0:
      if (config.customRule) {
        state.phase = 'custom_rule_creation';
      } else {
        state.currentPlayerIndex = nextPlayer(state);
      }
      break;

    case 5:
      if (config.slap) {
        state.phase = 'slap_race';
        state.pendingAction = {
          type: 'slap',
          deadline: Date.now() + 3000,
        };
      } else {
        state.currentPlayerIndex = nextPlayer(state);
      }
      break;

    default:
      state.currentPlayerIndex = nextPlayer(state);
      break;
  }

  state.turnStartTime = Date.now();
}

// Get sanitized state for a specific player (hide other hands)
function getStateForPlayer(state: GameState, playerId: string): any {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      hand: p.id === playerId ? p.hand : p.hand.map(() => ({ id: 'hidden', color: 'wild', value: 'wild' })),
    })),
    drawPile: [], // Don't send draw pile to clients
  };
}

// Socket handlers
io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create room
  socket.on('create_room', (data: { playerName: string }, callback) => {
    const code = generateRoomCode();
    const playerId = uuidv4();

    const room: Room = {
      code,
      hostId: playerId,
      players: new Map([[playerId, { id: playerId, name: data.playerName, socketId: socket.id, ready: false }]]),
      gameState: null,
      config: {
        enabledRules: {
          silence: true,
          customRule: true,
          stackDraw: true,
          stackSkip: true,
          slap: true,
          jumpIn: true,
          unoCall: true,
          offerCard: true,
        },
      },
    };

    rooms.set(code, room);
    playerRooms.set(socket.id, code);
    socket.join(code);

    callback({ success: true, code, playerId, isHost: true });
    console.log(`Room ${code} created by ${data.playerName}`);
  });

  // Join room
  socket.on('join_room', (data: { code: string; playerName: string }, callback) => {
    const room = rooms.get(data.code.toUpperCase());

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    if (room.gameState) {
      callback({ success: false, error: 'Game already in progress' });
      return;
    }

    if (room.players.size >= 8) {
      callback({ success: false, error: 'Room is full' });
      return;
    }

    const playerId = uuidv4();
    room.players.set(playerId, { id: playerId, name: data.playerName, socketId: socket.id, ready: false });
    playerRooms.set(socket.id, data.code.toUpperCase());
    socket.join(data.code.toUpperCase());

    callback({ success: true, code: data.code.toUpperCase(), playerId, isHost: false });

    // Notify others
    io.to(data.code.toUpperCase()).emit('player_joined', {
      players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, ready: p.ready })),
    });

    console.log(`${data.playerName} joined room ${data.code}`);
  });

  // Toggle ready
  socket.on('toggle_ready', (data: { playerId: string }) => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(data.playerId);
    if (player) {
      player.ready = !player.ready;
      io.to(roomCode).emit('player_ready_changed', {
        players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, ready: p.ready })),
      });
    }
  });

  // Update rules config
  socket.on('update_rules', (data: { rules: Room['config']['enabledRules'] }) => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room || room.gameState) return;

    // Only host can change rules
    const playerEntry = Array.from(room.players.entries()).find(([_, p]) => p.socketId === socket.id);
    if (!playerEntry || playerEntry[0] !== room.hostId) return;

    room.config.enabledRules = data.rules;
    io.to(roomCode).emit('rules_updated', { rules: data.rules });
  });

  // Start game
  socket.on('start_game', () => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    // Only host can start
    const playerEntry = Array.from(room.players.entries()).find(([_, p]) => p.socketId === socket.id);
    if (!playerEntry || playerEntry[0] !== room.hostId) return;

    if (room.players.size < 2) {
      socket.emit('error', { message: 'Need at least 2 players' });
      return;
    }

    // Initialize game
    room.gameState = initializeGame(room);

    // Send state to each player (with hidden hands)
    for (const [playerId, player] of room.players) {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.emit('game_started', {
          state: getStateForPlayer(room.gameState, playerId),
          playerId,
        });
      }
    }

    console.log(`Game started in room ${roomCode}`);
  });

  // Game action
  socket.on('game_action', (action: any) => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState) return;

    handleAction(room, action);

    // Broadcast updated state to all players
    for (const [playerId, player] of room.players) {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.emit('game_state_updated', {
          state: getStateForPlayer(room.gameState, playerId),
        });
      }
    }
  });

  // Leave room
  socket.on('leave_room', () => {
    handleDisconnect(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    handleDisconnect(socket);
    console.log(`Player disconnected: ${socket.id}`);
  });
});

function handleDisconnect(socket: Socket) {
  const roomCode = playerRooms.get(socket.id);
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  // Find and remove player
  for (const [playerId, player] of room.players) {
    if (player.socketId === socket.id) {
      room.players.delete(playerId);

      // If game in progress, mark as disconnected instead
      if (room.gameState) {
        const gamePlayer = room.gameState.players.find(p => p.id === playerId);
        if (gamePlayer) {
          gamePlayer.isConnected = false;
        }
      }

      break;
    }
  }

  playerRooms.delete(socket.id);

  // If room is empty, delete it
  if (room.players.size === 0) {
    rooms.delete(roomCode);
    console.log(`Room ${roomCode} deleted (empty)`);
  } else {
    // Notify others
    io.to(roomCode).emit('player_left', {
      players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, ready: p.ready })),
    });
  }
}

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Spicy UNO server running on port ${PORT}`);
  console.log(`Share your local IP to let others join!`);
});
