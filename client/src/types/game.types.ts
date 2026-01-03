// Card types
export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';

export type NumberValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type ActionValue = 'skip' | 'reverse' | 'draw2';
export type WildValue = 'wild' | 'wild_draw4';
export type CardValue = NumberValue | ActionValue | WildValue;

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

// Player types
export type PlayerType = 'human' | 'ai';

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  hasCalledUno: boolean;
  isConnected: boolean;
  type: PlayerType;
  avatar?: string;
}

// Game phase types
export type GamePhase =
  | 'waiting'
  | 'playing'
  | 'color_selection'
  | 'slap_race'
  | 'custom_rule_creation'
  | 'card_request'      // Someone is being asked for a card
  | 'offering_card'     // Requester deciding to accept/decline
  | 'game_over';

// Pending action types
export type PendingActionType =
  | 'draw_cards'
  | 'slap'
  | 'select_color'
  | 'create_rule'
  | 'card_request'      // Someone is asking for a card
  | 'offer_decision';   // Requester deciding to accept/decline

export interface PendingAction {
  type: PendingActionType;
  targetPlayer?: string;   // Player being asked for a card (the giver)
  requesterId?: string;    // Player who asked for a card
  amount?: number;
  deadline?: number;
  offeredCardId?: string;
  offererId?: string;
}

// Custom rule types
export type CustomRuleType = 'behavioral' | 'speech' | 'penalty' | 'action';

export interface CustomRule {
  id: string;
  text: string;
  type: CustomRuleType;
  createdBy: string;
  createdAt: number;
}

// Game state
export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  drawPile: Card[];
  discardPile: Card[];
  pendingAction: PendingAction | null;
  customRules: CustomRule[];
  silenceMode: boolean;
  stackedDrawAmount: number;
  turnStartTime: number;
  winner: string | null;
  lastAction: GameAction | null;
}

// Game actions
export type GameActionType =
  | 'play_card'
  | 'draw_card'
  | 'call_uno'
  | 'catch_uno'
  | 'slap'
  | 'create_custom_rule'
  | 'request_card'    // Player asks another player for a card
  | 'decline_request' // Asked player refuses to give a card
  | 'offer_card'      // Player offers a card in response to request
  | 'accept_offer'
  | 'decline_offer'
  | 'report_speaking'
  | 'select_color'
  | 'pass_turn'
  | 'jump_in';

export interface GameAction {
  type: GameActionType;
  playerId: string;
  cardId?: string;
  targetPlayerId?: string;
  wildColor?: CardColor;
  customRule?: Omit<CustomRule, 'id' | 'createdAt'>;
  timestamp?: number;
}

// Game events
export type GameEventType =
  | 'state_changed'
  | 'card_played'
  | 'card_drawn'
  | 'uno_called'
  | 'uno_caught'
  | 'slap_race_started'
  | 'slap_race_ended'
  | 'silence_toggled'
  | 'speaking_reported'
  | 'custom_rule_created'
  | 'card_requested'
  | 'request_declined'
  | 'card_offered'
  | 'offer_responded'
  | 'turn_changed'
  | 'game_over'
  | 'action_rejected'
  | 'jump_in';

export interface GameEvent {
  type: GameEventType;
  payload: unknown;
  timestamp: number;
}

// Game configuration
export interface GameConfig {
  playerCount: number;
  playerNames: string[];
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
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}
