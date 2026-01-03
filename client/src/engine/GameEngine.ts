import { v4 as uuidv4 } from 'uuid';
import type {
  GameState,
  GameAction,
  GameConfig,
  Card,
  Player,
  CardColor,
  ValidationResult,
  CustomRule,
  GameEventType,
} from '../types/game.types';
import {
  createDeck,
  shuffleDeck,
  drawCards,
  isPlayable,
  isExactMatch,
  isDrawCard,
  isSkipCard,
  isReverseCard,
  getDrawAmount,
  getCurrentColor,
} from './CardDeck';
import { EventBus } from './EventBus';

const INITIAL_HAND_SIZE = 7;

export class GameEngine {
  private state: GameState;
  private eventBus: EventBus;
  private config: GameConfig;
  private selectedWildColor: CardColor | null = null;

  constructor(config: GameConfig) {
    this.config = config;
    this.eventBus = new EventBus();
    this.state = this.createInitialState(config);
  }

  private createInitialState(config: GameConfig): GameState {
    // Create and shuffle deck
    let deck = shuffleDeck(createDeck());

    // Create players
    const players: Player[] = config.playerNames.map((name, index) => ({
      id: uuidv4(),
      name,
      hand: [],
      hasCalledUno: false,
      isConnected: true,
      type: index === 0 ? 'human' : (config.aiDifficulty ? 'ai' : 'human'),
    }));

    // Deal cards to players
    for (const player of players) {
      const { drawn, remaining } = drawCards(deck, INITIAL_HAND_SIZE);
      player.hand = drawn;
      deck = remaining;
    }

    // Find first playable card for discard pile (skip action cards)
    let firstCardIndex = deck.findIndex(
      (card) => card.color !== 'wild' && typeof card.value === 'number'
    );
    if (firstCardIndex === -1) firstCardIndex = 0;

    const firstCard = deck[firstCardIndex];
    deck = [...deck.slice(0, firstCardIndex), ...deck.slice(firstCardIndex + 1)];

    return {
      id: uuidv4(),
      phase: 'playing',
      players,
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: deck,
      discardPile: [firstCard],
      pendingAction: null,
      customRules: [],
      silenceMode: false,
      stackedDrawAmount: 0,
      turnStartTime: Date.now(),
      winner: null,
      lastAction: null,
    };
  }

  // Public API
  getState(): Readonly<GameState> {
    return this.state;
  }

  getTopCard(): Card {
    return this.state.discardPile[this.state.discardPile.length - 1];
  }

  getCurrentColor(): CardColor {
    return getCurrentColor(this.getTopCard(), this.selectedWildColor ?? undefined);
  }

  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getValidMoves(playerId: string): Card[] {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return [];

    const topCard = this.getTopCard();
    const currentColor = this.getCurrentColor();

    // If there's a stacked draw, only draw cards of same type can be played
    if (this.state.stackedDrawAmount > 0 && this.config.enabledRules.stackDraw) {
      const lastCard = this.getTopCard();
      return player.hand.filter((card) => {
        if (lastCard.value === 'draw2') {
          return card.value === 'draw2';
        }
        if (lastCard.value === 'wild_draw4') {
          return card.value === 'wild_draw4';
        }
        return false;
      });
    }

    return player.hand.filter((card) => isPlayable(card, topCard, currentColor));
  }

  canJumpIn(playerId: string, cardId: string): boolean {
    if (!this.config.enabledRules.jumpIn) return false;

    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return false;

    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return false;

    return isExactMatch(card, this.getTopCard());
  }

  // Get players who have no valid moves (for offer card feature)
  getStuckPlayers(excludePlayerId?: string): Player[] {
    if (!this.config.enabledRules.offerCard) return [];

    return this.state.players.filter((player) => {
      // Exclude the specified player (usually the one offering)
      if (excludePlayerId && player.id === excludePlayerId) return false;

      // Check if they have no valid moves
      const validMoves = this.getValidMoves(player.id);
      return validMoves.length === 0;
    });
  }

  // Event handling
  on<T = unknown>(event: GameEventType, handler: (payload: T) => void): () => void {
    return this.eventBus.on(event, handler);
  }

  off<T = unknown>(event: GameEventType, handler: (payload: T) => void): void {
    this.eventBus.off(event, handler);
  }

  // Action validation
  validateAction(action: GameAction): ValidationResult {
    const { type, playerId, cardId } = action;
    const player = this.state.players.find((p) => p.id === playerId);

    if (!player) {
      return { valid: false, reason: 'Player not found' };
    }

    switch (type) {
      case 'play_card': {
        if (!cardId) {
          return { valid: false, reason: 'No card specified' };
        }

        const card = player.hand.find((c) => c.id === cardId);
        if (!card) {
          return { valid: false, reason: 'Card not in hand' };
        }

        // Check if it's player's turn (unless jump-in)
        const isCurrentPlayer = this.state.players[this.state.currentPlayerIndex].id === playerId;
        if (!isCurrentPlayer) {
          if (this.canJumpIn(playerId, cardId)) {
            return { valid: true };
          }
          return { valid: false, reason: 'Not your turn' };
        }

        // Check if card is playable
        const validMoves = this.getValidMoves(playerId);
        if (!validMoves.find((c) => c.id === cardId)) {
          return { valid: false, reason: 'Card cannot be played' };
        }

        // Wild cards need a color selection
        if (card.color === 'wild' && !action.wildColor) {
          return { valid: false, reason: 'Must select a color for wild card' };
        }

        return { valid: true };
      }

      case 'draw_card': {
        const isCurrentPlayer = this.state.players[this.state.currentPlayerIndex].id === playerId;
        if (!isCurrentPlayer) {
          return { valid: false, reason: 'Not your turn' };
        }
        return { valid: true };
      }

      case 'call_uno': {
        if (player.hand.length !== 2) {
          return { valid: false, reason: 'Can only call UNO with 2 cards' };
        }
        return { valid: true };
      }

      case 'catch_uno': {
        const target = this.state.players.find((p) => p.id === action.targetPlayerId);
        if (!target) {
          return { valid: false, reason: 'Target player not found' };
        }
        if (target.hand.length !== 1 || target.hasCalledUno) {
          return { valid: false, reason: 'Cannot catch this player' };
        }
        return { valid: true };
      }

      case 'slap': {
        if (this.state.phase !== 'slap_race') {
          return { valid: false, reason: 'No slap race active' };
        }
        return { valid: true };
      }

      case 'select_color': {
        if (this.state.phase !== 'color_selection') {
          return { valid: false, reason: 'Not selecting color' };
        }
        return { valid: true };
      }

      default:
        return { valid: true };
    }
  }

  // Main action dispatcher
  dispatch(action: GameAction): GameState {
    const validation = this.validateAction(action);
    if (!validation.valid) {
      this.eventBus.emit('action_rejected', { action, reason: validation.reason });
      return this.state;
    }

    const newState = this.applyAction(action);
    this.state = newState;
    this.state.lastAction = action;

    this.eventBus.emit('state_changed', this.state);

    return this.state;
  }

  private applyAction(action: GameAction): GameState {
    const state = { ...this.state };

    switch (action.type) {
      case 'play_card':
        return this.handlePlayCard(state, action);

      case 'draw_card':
        return this.handleDrawCard(state, action);

      case 'call_uno':
        return this.handleCallUno(state, action);

      case 'catch_uno':
        return this.handleCatchUno(state, action);

      case 'slap':
        return this.handleSlap(state, action);

      case 'select_color':
        return this.handleSelectColor(state, action);

      case 'create_custom_rule':
        return this.handleCreateCustomRule(state, action);

      case 'report_speaking':
        return this.handleReportSpeaking(state, action);

      case 'request_card':
        return this.handleRequestCard(state, action);

      case 'decline_request':
        return this.handleDeclineRequest(state, action);

      case 'offer_card':
        return this.handleOfferCard(state, action);

      case 'accept_offer':
        return this.handleAcceptOffer(state, action);

      case 'decline_offer':
        return this.handleDeclineOffer(state, action);

      case 'pass_turn':
        return this.handlePassTurn(state, action);

      case 'jump_in':
        return this.handleJumpIn(state, action);

      default:
        return state;
    }
  }

  private handlePlayCard(state: GameState, action: GameAction): GameState {
    const { playerId, cardId, wildColor } = action;
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    const player = state.players[playerIndex];
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    const card = player.hand[cardIndex];

    // Remove card from hand
    const newHand = [...player.hand.slice(0, cardIndex), ...player.hand.slice(cardIndex + 1)];
    const newPlayers = [...state.players];
    newPlayers[playerIndex] = { ...player, hand: newHand, hasCalledUno: false };

    // Add card to discard pile
    const newDiscardPile = [...state.discardPile, card];

    // Set wild color
    if (card.color === 'wild' && wildColor) {
      this.selectedWildColor = wildColor;
    } else {
      this.selectedWildColor = null;
    }

    let newState: GameState = {
      ...state,
      players: newPlayers,
      discardPile: newDiscardPile,
    };

    // Check for win
    if (newHand.length === 0) {
      newState.phase = 'game_over';
      newState.winner = playerId;
      this.eventBus.emit('game_over', { winner: player });
      return newState;
    }

    // Apply card effects
    newState = this.applyCardEffects(newState, card, playerIndex);

    this.eventBus.emit('card_played', { player, card });

    return newState;
  }

  private applyCardEffects(state: GameState, card: Card, playerIndex: number): GameState {
    let newState = { ...state };

    // Handle draw cards (+2, +4)
    if (isDrawCard(card)) {
      const drawAmount = getDrawAmount(card);

      if (this.config.enabledRules.stackDraw) {
        // Stack the draw
        newState.stackedDrawAmount += drawAmount;
        newState = this.advanceTurn(newState);

        // Check if next player can stack
        const nextPlayer = newState.players[newState.currentPlayerIndex];
        const canStack = nextPlayer.hand.some((c) => {
          if (card.value === 'draw2') return c.value === 'draw2';
          if (card.value === 'wild_draw4') return c.value === 'wild_draw4';
          return false;
        });

        if (!canStack) {
          // Next player must draw
          newState = this.forceDrawCards(newState, nextPlayer.id, newState.stackedDrawAmount);
          newState.stackedDrawAmount = 0;
          newState = this.advanceTurn(newState);
        }
      } else {
        // No stacking - next player draws immediately
        newState = this.advanceTurn(newState);
        const nextPlayer = newState.players[newState.currentPlayerIndex];
        newState = this.forceDrawCards(newState, nextPlayer.id, drawAmount);
        newState = this.advanceTurn(newState);
      }
      return newState;
    }

    // Handle skip
    if (isSkipCard(card)) {
      newState = this.advanceTurn(newState); // Skip to next
      newState = this.advanceTurn(newState); // Then to the one after
      return newState;
    }

    // Handle reverse
    if (isReverseCard(card)) {
      newState.direction = (newState.direction * -1) as 1 | -1;

      // In 2-player game, reverse acts as skip
      if (newState.players.length === 2) {
        newState = this.advanceTurn(newState);
        newState = this.advanceTurn(newState);
      } else {
        newState = this.advanceTurn(newState);
      }
      return newState;
    }

    // Handle spicy rules
    if (this.config.enabledRules.silence && card.value === 7) {
      newState.silenceMode = !newState.silenceMode;
      this.eventBus.emit('silence_toggled', { active: newState.silenceMode });
    }

    if (this.config.enabledRules.customRule && card.value === 0) {
      newState.phase = 'custom_rule_creation';
      newState.pendingAction = {
        type: 'create_rule',
        targetPlayer: state.players[playerIndex].id,
      };
      return newState;
    }

    if (this.config.enabledRules.slap && card.value === 5) {
      newState.phase = 'slap_race';
      newState.pendingAction = {
        type: 'slap',
        deadline: Date.now() + 3000,
      };
      this.eventBus.emit('slap_race_started', { deadline: newState.pendingAction.deadline });
      return newState;
    }

    // Normal card - advance turn
    newState = this.advanceTurn(newState);
    return newState;
  }

  private handleDrawCard(state: GameState, action: GameAction): GameState {
    const { playerId } = action;
    let newState = { ...state };

    // If there's a stacked draw amount, draw that many
    const drawCount = newState.stackedDrawAmount > 0 ? newState.stackedDrawAmount : 1;
    newState = this.forceDrawCards(newState, playerId, drawCount);
    newState.stackedDrawAmount = 0;

    this.eventBus.emit('card_drawn', { playerId, count: drawCount });

    // After drawing, player can play the drawn card if it's playable (if only drew 1)
    // For now, just advance turn
    newState = this.advanceTurn(newState);

    return newState;
  }

  private forceDrawCards(state: GameState, playerId: string, count: number): GameState {
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    const player = state.players[playerIndex];

    let drawPile = [...state.drawPile];
    let discardPile = [...state.discardPile];

    // Reshuffle if needed
    if (drawPile.length < count) {
      const topCard = discardPile.pop()!;
      drawPile = shuffleDeck([...drawPile, ...discardPile]);
      discardPile = [topCard];
    }

    const { drawn, remaining } = drawCards(drawPile, count);
    const newHand = [...player.hand, ...drawn];

    const newPlayers = [...state.players];
    newPlayers[playerIndex] = { ...player, hand: newHand };

    return {
      ...state,
      players: newPlayers,
      drawPile: remaining,
      discardPile,
    };
  }

  private handleCallUno(state: GameState, action: GameAction): GameState {
    const { playerId } = action;
    const playerIndex = state.players.findIndex((p) => p.id === playerId);

    const newPlayers = [...state.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], hasCalledUno: true };

    this.eventBus.emit('uno_called', { playerId });

    return {
      ...state,
      players: newPlayers,
    };
  }

  private handleCatchUno(state: GameState, action: GameAction): GameState {
    const { targetPlayerId } = action;
    if (!targetPlayerId) return state;

    // Target draws 2 cards as penalty
    let newState = this.forceDrawCards(state, targetPlayerId, 2);

    this.eventBus.emit('uno_caught', { targetPlayerId, catcherId: action.playerId });

    return newState;
  }

  private handleSlap(state: GameState, _action: GameAction): GameState {
    // Slap handling would track timestamps and determine loser
    // For now, simplified - first to slap wins, handled externally
    return state;
  }

  private handleSelectColor(state: GameState, action: GameAction): GameState {
    if (action.wildColor) {
      this.selectedWildColor = action.wildColor;
    }

    const updatedState: GameState = { ...state, phase: 'playing', pendingAction: null };
    const newState = this.advanceTurn(updatedState);

    return newState;
  }

  private handleCreateCustomRule(state: GameState, action: GameAction): GameState {
    if (!action.customRule) return state;

    const newRule: CustomRule = {
      id: uuidv4(),
      text: action.customRule.text,
      type: action.customRule.type,
      createdBy: action.playerId,
      createdAt: Date.now(),
    };

    let newState: GameState = {
      ...state,
      phase: 'playing',
      pendingAction: null,
      customRules: [...state.customRules, newRule],
    };

    this.eventBus.emit('custom_rule_created', { rule: newRule });

    newState = this.advanceTurn(newState);
    return newState;
  }

  private handleReportSpeaking(state: GameState, action: GameAction): GameState {
    if (!this.config.enabledRules.silence || !state.silenceMode) return state;
    if (!action.targetPlayerId) return state;

    // Target draws 1 card
    const newState = this.forceDrawCards(state, action.targetPlayerId, 1);

    this.eventBus.emit('speaking_reported', {
      reporterId: action.playerId,
      targetId: action.targetPlayerId,
    });

    return newState;
  }

  // Player requests a card from another player
  private handleRequestCard(state: GameState, action: GameAction): GameState {
    if (!this.config.enabledRules.offerCard) return state;
    if (!action.targetPlayerId) return state;

    // Can't request from yourself
    if (action.playerId === action.targetPlayerId) return state;

    // Target must have cards to give
    const target = state.players.find((p) => p.id === action.targetPlayerId);
    if (!target || target.hand.length === 0) return state;

    const newState: GameState = {
      ...state,
      phase: 'card_request',
      pendingAction: {
        type: 'card_request',
        requesterId: action.playerId,
        targetPlayer: action.targetPlayerId,
      },
    };

    this.eventBus.emit('card_requested', {
      requesterId: action.playerId,
      targetId: action.targetPlayerId,
    });

    return newState;
  }

  // Asked player declines to give a card
  private handleDeclineRequest(state: GameState, action: GameAction): GameState {
    if (state.phase !== 'card_request' || !state.pendingAction) return state;
    if (state.pendingAction.targetPlayer !== action.playerId) return state;

    this.eventBus.emit('request_declined', {
      requesterId: state.pendingAction.requesterId,
      declinerId: action.playerId,
    });

    return {
      ...state,
      phase: 'playing',
      pendingAction: null,
    };
  }

  // Player offers a card in response to a request
  private handleOfferCard(state: GameState, action: GameAction): GameState {
    if (!this.config.enabledRules.offerCard) return state;
    if (!action.cardId) return state;

    // Must be in card_request phase with this player as the target
    if (state.phase !== 'card_request' || !state.pendingAction) return state;
    if (state.pendingAction.targetPlayer !== action.playerId) return state;

    const requesterId = state.pendingAction.requesterId;
    if (!requesterId) return state;

    const newState: GameState = {
      ...state,
      phase: 'offering_card',
      pendingAction: {
        type: 'offer_decision',
        offererId: action.playerId,
        targetPlayer: requesterId,  // The requester is now the target of the offer
        offeredCardId: action.cardId,
        requesterId: requesterId,
      },
    };

    this.eventBus.emit('card_offered', {
      offererId: action.playerId,
      targetId: requesterId,
    });

    return newState;
  }

  private handleAcceptOffer(state: GameState, _action: GameAction): GameState {
    if (!state.pendingAction || state.pendingAction.type !== 'offer_decision') return state;

    const { offererId, offeredCardId, targetPlayer } = state.pendingAction;
    if (!offererId || !offeredCardId || !targetPlayer) return state;

    const offererIndex = state.players.findIndex((p) => p.id === offererId);
    const targetIndex = state.players.findIndex((p) => p.id === targetPlayer);

    const offerer = state.players[offererIndex];
    const target = state.players[targetIndex];

    const cardIndex = offerer.hand.findIndex((c) => c.id === offeredCardId);
    const card = offerer.hand[cardIndex];

    // Remove card from offerer
    const newOffererHand = [
      ...offerer.hand.slice(0, cardIndex),
      ...offerer.hand.slice(cardIndex + 1),
    ];

    // Add card to target
    const newTargetHand = [...target.hand, card];

    const newPlayers = [...state.players];
    newPlayers[offererIndex] = { ...offerer, hand: newOffererHand };
    newPlayers[targetIndex] = { ...target, hand: newTargetHand };

    this.eventBus.emit('offer_responded', { accepted: true, card });

    return {
      ...state,
      phase: 'playing',
      pendingAction: null,
      players: newPlayers,
    };
  }

  private handleDeclineOffer(state: GameState, _action: GameAction): GameState {
    this.eventBus.emit('offer_responded', { accepted: false });

    return {
      ...state,
      phase: 'playing',
      pendingAction: null,
    };
  }

  private handlePassTurn(state: GameState, _action: GameAction): GameState {
    return this.advanceTurn(state);
  }

  private handleJumpIn(state: GameState, action: GameAction): GameState {
    // Jump-in is handled like a normal play, but the turn shifts to the jumper
    const { playerId } = action;
    const playerIndex = state.players.findIndex((p) => p.id === playerId);

    // Set current player to the one who jumped in
    let newState: GameState = {
      ...state,
      currentPlayerIndex: playerIndex,
    };

    // Then play the card normally
    return this.handlePlayCard(newState, action);
  }

  private advanceTurn(state: GameState): GameState {
    const numPlayers = state.players.length;
    let nextIndex = state.currentPlayerIndex + state.direction;

    // Wrap around
    if (nextIndex < 0) nextIndex = numPlayers - 1;
    if (nextIndex >= numPlayers) nextIndex = 0;

    this.eventBus.emit('turn_changed', {
      previousPlayer: state.players[state.currentPlayerIndex],
      currentPlayer: state.players[nextIndex],
    });

    return {
      ...state,
      currentPlayerIndex: nextIndex,
      turnStartTime: Date.now(),
    };
  }

  // Slap race resolution (called externally when race ends)
  resolveSlapRace(slapResults: { playerId: string; timestamp: number }[]): GameState {
    if (this.state.phase !== 'slap_race') return this.state;

    // Sort by timestamp (earlier = faster)
    const sorted = [...slapResults].sort((a, b) => a.timestamp - b.timestamp);

    // Players who didn't slap
    const slappedPlayerIds = new Set(sorted.map((s) => s.playerId));
    const nonSlappers = this.state.players.filter((p) => !slappedPlayerIds.has(p.id));

    // Loser is either the last slapper or a non-slapper
    let loserId: string;
    if (nonSlappers.length > 0) {
      loserId = nonSlappers[0].id;
    } else {
      loserId = sorted[sorted.length - 1].playerId;
    }

    let newState = this.forceDrawCards(this.state, loserId, 1);

    this.eventBus.emit('slap_race_ended', { loserId });

    newState = {
      ...newState,
      phase: 'playing',
      pendingAction: null,
    };

    newState = this.advanceTurn(newState);
    this.state = newState;

    this.eventBus.emit('state_changed', this.state);

    return this.state;
  }

  // Reset game
  reset(): void {
    this.state = this.createInitialState(this.config);
    this.selectedWildColor = null;
    this.eventBus.emit('state_changed', this.state);
  }
}
