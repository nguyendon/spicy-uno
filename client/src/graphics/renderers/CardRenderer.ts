import type { Card, CardColor } from '../../types/game.types';

export const CARD_WIDTH = 100;
export const CARD_HEIGHT = 150;
export const CARD_RADIUS = 10;

const COLORS: Record<CardColor, string> = {
  red: '#E53935',
  yellow: '#FDD835',
  green: '#43A047',
  blue: '#1E88E5',
  wild: '#1A1A1A',
};

export interface CardRenderOptions {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  highlighted?: boolean;
  faceDown?: boolean;
  glowColor?: string;
  selected?: boolean;
  hovering?: boolean;
}

export function renderCard(
  ctx: CanvasRenderingContext2D,
  card: Card,
  options: CardRenderOptions
): void {
  const {
    x,
    y,
    scale = 1,
    rotation = 0,
    opacity = 1,
    highlighted = false,
    faceDown = false,
    glowColor = null,
    selected = false,
    hovering = false,
  } = options;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = opacity;

  const w = CARD_WIDTH;
  const h = CARD_HEIGHT;

  // Draw glow effect
  if (glowColor || highlighted) {
    ctx.shadowColor = glowColor || '#FFD700';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Draw card shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  roundRect(ctx, -w / 2 + 4, -h / 2 + 4, w, h, CARD_RADIUS);
  ctx.fill();

  // Reset shadow for card body
  ctx.shadowBlur = 0;

  if (faceDown) {
    renderCardBack(ctx, w, h);
  } else {
    renderCardFront(ctx, card, w, h);
  }

  // Selection/hover highlight
  if (selected || hovering) {
    ctx.strokeStyle = selected ? '#00FF00' : '#FFFFFF';
    ctx.lineWidth = 3;
    roundRect(ctx, -w / 2, -h / 2, w, h, CARD_RADIUS);
    ctx.stroke();
  }

  ctx.restore();
}

function renderCardBack(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Card background
  const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  gradient.addColorStop(0, '#2C3E50');
  gradient.addColorStop(1, '#1A252F');
  ctx.fillStyle = gradient;
  roundRect(ctx, -w / 2, -h / 2, w, h, CARD_RADIUS);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#34495E';
  ctx.lineWidth = 2;
  roundRect(ctx, -w / 2, -h / 2, w, h, CARD_RADIUS);
  ctx.stroke();

  // UNO logo pattern
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.3, h * 0.25, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('UNO', 0, 0);
}

function renderCardFront(ctx: CanvasRenderingContext2D, card: Card, w: number, h: number): void {
  const color = COLORS[card.color];

  // Card background
  ctx.fillStyle = color;
  roundRect(ctx, -w / 2, -h / 2, w, h, CARD_RADIUS);
  ctx.fill();

  // White inner border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  roundRect(ctx, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, CARD_RADIUS - 2);
  ctx.stroke();

  // Center oval
  ctx.save();
  ctx.rotate(Math.PI / 6);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Card value
  const displayValue = getDisplayValue(card);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (typeof card.value === 'number') {
    ctx.font = 'bold 56px Arial';
    ctx.fillText(displayValue, 0, 0);
  } else {
    // Action cards
    renderActionSymbol(ctx, card, w, h, color);
  }

  // Corner values
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';

  // Top-left
  ctx.save();
  ctx.translate(-w / 2 + 12, -h / 2 + 18);
  ctx.fillText(getCornerValue(card), 0, 0);
  ctx.restore();

  // Bottom-right (rotated)
  ctx.save();
  ctx.translate(w / 2 - 12, h / 2 - 18);
  ctx.rotate(Math.PI);
  ctx.fillText(getCornerValue(card), 0, 0);
  ctx.restore();
}

function renderActionSymbol(
  ctx: CanvasRenderingContext2D,
  card: Card,
  _w: number,
  _h: number,
  color: string
): void {
  ctx.fillStyle = color;

  switch (card.value) {
    case 'skip':
      // Draw circle with line through it
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, 18);
      ctx.lineTo(18, -18);
      ctx.stroke();
      break;

    case 'reverse':
      // Draw arrows
      ctx.font = 'bold 48px Arial';
      ctx.fillText('⇄', 0, 0);
      break;

    case 'draw2':
      // Draw +2
      ctx.font = 'bold 36px Arial';
      ctx.fillText('+2', 0, 0);
      break;

    case 'wild':
      // Draw 4 colored sections
      drawWildSymbol(ctx, 25);
      break;

    case 'wild_draw4':
      // Draw 4 colored sections with +4
      drawWildSymbol(ctx, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('+4', 0, 35);
      break;
  }
}

function drawWildSymbol(ctx: CanvasRenderingContext2D, size: number): void {
  const colors = ['#E53935', '#FDD835', '#43A047', '#1E88E5'];
  const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size, angles[i], angles[i] + Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  }
}

function getDisplayValue(card: Card): string {
  if (typeof card.value === 'number') {
    return card.value.toString();
  }

  switch (card.value) {
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return '+2';
    case 'wild':
      return 'W';
    case 'wild_draw4':
      return '+4';
    default:
      return '';
  }
}

function getCornerValue(card: Card): string {
  if (typeof card.value === 'number') {
    return card.value.toString();
  }

  switch (card.value) {
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return '+2';
    case 'wild':
    case 'wild_draw4':
      return '';
    default:
      return '';
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
