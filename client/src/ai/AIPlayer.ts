import type { GameState, GameAction, Card, CardColor, Player } from '../types/game.types';
import { isPlayable, getCurrentColor } from '../engine/CardDeck';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIDecision {
  action: GameAction;
  delay: number; // Milliseconds to wait before executing
}

export class AIPlayer {
  readonly id: string;
  readonly difficulty: AIDifficulty;

  constructor(id: string, difficulty: AIDifficulty) {
    this.id = id;
    this.difficulty = difficulty;
  }

  makeDecision(state: GameState): AIDecision | null {
    const player = state.players.find((p) => p.id === this.id);
    if (!player) return null;

    // Check if it's our turn
    const isMyTurn = state.players[state.currentPlayerIndex].id === this.id;
    if (!isMyTurn && state.phase === 'playing') return null;

    // Handle different game phases
    switch (state.phase) {
      case 'playing':
        return this.decidePlay(state, player);

      case 'slap_race':
        return this.decideSlap(state);

      case 'custom_rule_creation':
        return this.decideCustomRule(state);

      default:
        return null;
    }
  }

  private decidePlay(state: GameState, player: Player): AIDecision {
    const topCard = state.discardPile[state.discardPile.length - 1];
    const currentColor = getCurrentColor(topCard);
    const validMoves = player.hand.filter((card) => isPlayable(card, topCard, currentColor));

    // Must draw if stacked and can't counter
    if (state.stackedDrawAmount > 0) {
      const canCounter = validMoves.some(
        (c) => c.value === 'draw2' || c.value === 'wild_draw4'
      );

      if (!canCounter) {
        return {
          action: { type: 'draw_card', playerId: this.id },
          delay: this.getThinkingDelay(),
        };
      }

      // Counter with a draw card
      const counterCard = validMoves.find(
        (c) => c.value === 'draw2' || c.value === 'wild_draw4'
      )!;
      return this.playCardDecision(counterCard);
    }

    // No valid moves, must draw
    if (validMoves.length === 0) {
      return {
        action: { type: 'draw_card', playerId: this.id },
        delay: this.getThinkingDelay(),
      };
    }

    // Pick best card based on strategy
    const bestCard = this.pickBestCard(validMoves, player.hand, state);
    return this.playCardDecision(bestCard);
  }

  private pickBestCard(validMoves: Card[], hand: Card[], state: GameState): Card {
    // Different strategies based on difficulty
    if (this.difficulty === 'easy') {
      // Random valid move
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    if (this.difficulty === 'medium') {
      // Basic strategy: prefer action cards, then match colors
      return this.basicStrategy(validMoves, hand);
    }

    // Hard: optimal strategy
    return this.optimalStrategy(validMoves, hand, state);
  }

  private basicStrategy(validMoves: Card[], _hand: Card[]): Card {
    // Priority: +4 > +2 > Skip > Reverse > Numbers (high to low) > Wild

    const priority = (card: Card): number => {
      if (card.value === 'wild_draw4') return 100;
      if (card.value === 'draw2') return 80;
      if (card.value === 'skip') return 60;
      if (card.value === 'reverse') return 50;
      if (card.value === 'wild') return 10;
      if (typeof card.value === 'number') return card.value + 20;
      return 0;
    };

    return validMoves.sort((a, b) => priority(b) - priority(a))[0];
  }

  private optimalStrategy(validMoves: Card[], hand: Card[], state: GameState): Card {
    // Consider multiple factors:
    // 1. Save wild cards for when needed
    // 2. Play cards that match the most cards in hand
    // 3. Target low-card players with action cards
    // 4. Consider special rule implications (7, 0, 5)

    const scoreCard = (card: Card): number => {
      let score = 0;

      // Prefer playing cards that match colors in our hand
      const colorCount = hand.filter((c) => c.color === card.color).length;
      score += colorCount * 5;

      // Penalize using wild cards unless necessary
      if (card.color === 'wild') {
        const nonWildMoves = validMoves.filter((c) => c.color !== 'wild');
        if (nonWildMoves.length > 0) {
          score -= 50;
        }
      }

      // Prefer action cards when opponents have few cards
      const minOpponentCards = Math.min(
        ...state.players.filter((p) => p.id !== this.id).map((p) => p.hand.length)
      );

      if (minOpponentCards <= 3) {
        if (card.value === 'skip' || card.value === 'reverse') score += 30;
        if (card.value === 'draw2') score += 40;
        if (card.value === 'wild_draw4') score += 50;
      }

      // Consider special spicy rules
      if (card.value === 5) {
        // 5 triggers slap - we might lose
        score -= 10;
      }

      if (card.value === 7) {
        // 7 triggers silence - could be strategic
        score += 5;
      }

      // Play high numbers first (harder to play later)
      if (typeof card.value === 'number') {
        score += card.value;
      }

      return score;
    };

    return validMoves.sort((a, b) => scoreCard(b) - scoreCard(a))[0];
  }

  private playCardDecision(card: Card): AIDecision {
    const action: GameAction = {
      type: 'play_card',
      playerId: this.id,
      cardId: card.id,
    };

    // Add wild color if needed
    if (card.color === 'wild') {
      action.wildColor = this.pickWildColor();
    }

    return {
      action,
      delay: this.getThinkingDelay(),
    };
  }

  private pickWildColor(): CardColor {
    // TODO: Could be smarter and pick based on remaining hand
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private decideSlap(_state: GameState): AIDecision {
    // AI reaction time based on difficulty
    const baseDelay = {
      easy: 1500,
      medium: 800,
      hard: 200,
    }[this.difficulty];

    const variance = Math.random() * 500;

    return {
      action: {
        type: 'slap',
        playerId: this.id,
        timestamp: Date.now() + baseDelay + variance,
      },
      delay: baseDelay + variance,
    };
  }

  private decideCustomRule(_state: GameState): AIDecision {
    const rules = [
      { text: 'Must say thank you when drawing', type: 'speech' as const },
      { text: 'No pointing at people', type: 'behavioral' as const },
      { text: 'Knock before playing a card', type: 'action' as const },
      { text: 'Draw 1 if you touch your face', type: 'penalty' as const },
      { text: 'Must speak in an accent', type: 'behavioral' as const },
    ];

    const rule = rules[Math.floor(Math.random() * rules.length)];

    return {
      action: {
        type: 'create_custom_rule',
        playerId: this.id,
        customRule: {
          text: rule.text,
          type: rule.type,
          createdBy: this.id,
        },
      },
      delay: 1500,
    };
  }

  private getThinkingDelay(): number {
    const baseDelay = {
      easy: 1500,
      medium: 1000,
      hard: 500,
    }[this.difficulty];

    // Add some randomness to feel more human
    return baseDelay + Math.random() * 500;
  }

  // Check if AI should call UNO
  shouldCallUno(state: GameState): boolean {
    const player = state.players.find((p) => p.id === this.id);
    if (!player || player.hand.length !== 2) return false;

    // AI might forget based on difficulty
    const rememberChance = {
      easy: 0.6,
      medium: 0.85,
      hard: 0.98,
    }[this.difficulty];

    return Math.random() < rememberChance;
  }

  // Check if AI should catch someone's UNO
  shouldCatchUno(state: GameState, targetId: string): boolean {
    const target = state.players.find((p) => p.id === targetId);
    if (!target || target.hand.length !== 1 || target.hasCalledUno) return false;

    // AI might miss catching based on difficulty
    const catchChance = {
      easy: 0.3,
      medium: 0.6,
      hard: 0.9,
    }[this.difficulty];

    return Math.random() < catchChance;
  }
}
