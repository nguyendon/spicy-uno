import { v4 as uuidv4 } from 'uuid';
import type { Card, CardColor, CardValue, NumberValue, ActionValue } from '../types/game.types';

const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const NUMBERS: NumberValue[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const ACTIONS: ActionValue[] = ['skip', 'reverse', 'draw2'];

export function createCard(color: CardColor, value: CardValue): Card {
  return {
    id: uuidv4(),
    color,
    value,
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Add colored cards
  for (const color of COLORS) {
    // One 0 per color
    deck.push(createCard(color, 0));

    // Two of each 1-9 per color
    for (const num of NUMBERS.slice(1)) {
      deck.push(createCard(color, num));
      deck.push(createCard(color, num));
    }

    // Two of each action card per color
    for (const action of ACTIONS) {
      deck.push(createCard(color, action));
      deck.push(createCard(color, action));
    }
  }

  // Add wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push(createCard('wild', 'wild'));
    deck.push(createCard('wild', 'wild_draw4'));
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
}

export function isPlayable(card: Card, topCard: Card, currentColor: CardColor): boolean {
  // Wild cards are always playable
  if (card.color === 'wild') {
    return true;
  }

  // Match color
  if (card.color === currentColor) {
    return true;
  }

  // Match value (number or action)
  if (card.value === topCard.value) {
    return true;
  }

  return false;
}

export function isExactMatch(card: Card, topCard: Card): boolean {
  // For jump-in rule: must be exact same color AND same number value
  return (
    card.color === topCard.color &&
    card.value === topCard.value &&
    typeof card.value === 'number'
  );
}

export function getCardDisplayName(card: Card): string {
  const colorName = card.color === 'wild' ? '' : card.color.charAt(0).toUpperCase() + card.color.slice(1);

  let valueName: string;
  if (typeof card.value === 'number') {
    valueName = card.value.toString();
  } else {
    switch (card.value) {
      case 'skip':
        valueName = 'Skip';
        break;
      case 'reverse':
        valueName = 'Reverse';
        break;
      case 'draw2':
        valueName = '+2';
        break;
      case 'wild':
        valueName = 'Wild';
        break;
      case 'wild_draw4':
        valueName = 'Wild +4';
        break;
      default:
        valueName = card.value;
    }
  }

  return colorName ? `${colorName} ${valueName}` : valueName;
}

export function getCurrentColor(topCard: Card, selectedColor?: CardColor): CardColor {
  if (topCard.color === 'wild' && selectedColor) {
    return selectedColor;
  }
  return topCard.color === 'wild' ? 'red' : topCard.color;
}

export function isDrawCard(card: Card): boolean {
  return card.value === 'draw2' || card.value === 'wild_draw4';
}

export function isSkipCard(card: Card): boolean {
  return card.value === 'skip';
}

export function isReverseCard(card: Card): boolean {
  return card.value === 'reverse';
}

export function getDrawAmount(card: Card): number {
  if (card.value === 'draw2') return 2;
  if (card.value === 'wild_draw4') return 4;
  return 0;
}
