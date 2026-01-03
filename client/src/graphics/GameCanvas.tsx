import { useRef, useEffect, useCallback } from 'react';
import type { GameState, Card } from '../types/game.types';
import { renderCard, CARD_WIDTH, CARD_HEIGHT } from './renderers/CardRenderer';
import { AnimationEngine } from './animations/AnimationEngine';

interface GameCanvasProps {
  gameState: GameState;
  currentPlayerId: string;
  onCardClick?: (cardId: string) => void;
  onDeckClick?: () => void;
  validMoves?: string[];
}

interface CardPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  card: Card;
  isHovered: boolean;
}

export function GameCanvas({
  gameState,
  currentPlayerId,
  onCardClick,
  onDeckClick,
  validMoves = [],
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationEngineRef = useRef<AnimationEngine>(new AnimationEngine());
  const mousePos = useRef({ x: 0, y: 0 });
  const hoveredCardRef = useRef<string | null>(null);
  const cardPositionsRef = useRef<Map<string, CardPosition>>(new Map());

  // Get current player's hand
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  const hand = currentPlayer?.hand || [];

  // Calculate card positions for player's hand
  const getHandPositions = useCallback(
    (canvas: HTMLCanvasElement): Map<string, CardPosition> => {
      const positions = new Map<string, CardPosition>();
      const handWidth = Math.min(hand.length * 80, canvas.width - 100);
      const startX = (canvas.width - handWidth) / 2 + CARD_WIDTH / 2;
      const y = canvas.height - CARD_HEIGHT / 2 - 30;

      hand.forEach((card, index) => {
        const spreadAngle = Math.min(40, hand.length * 3);
        const anglePerCard = hand.length > 1 ? spreadAngle / (hand.length - 1) : 0;
        const startAngle = -spreadAngle / 2;
        const rotation = ((startAngle + anglePerCard * index) * Math.PI) / 180;

        const x = startX + index * (handWidth / Math.max(hand.length - 1, 1));
        const arcY = Math.abs(index - (hand.length - 1) / 2) * 5;

        positions.set(card.id, {
          x,
          y: y + arcY,
          rotation,
          scale: 1,
          card,
          isHovered: hoveredCardRef.current === card.id,
        });
      });

      return positions;
    },
    [hand]
  );

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update animation engine
    animationEngineRef.current.update(performance.now());

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw table background
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2
    );
    gradient.addColorStop(0, '#1a472a');
    gradient.addColorStop(1, '#0d2818');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw felt texture pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < canvas.width; i += 4) {
      for (let j = 0; j < canvas.height; j += 4) {
        if ((i + j) % 8 === 0) {
          ctx.fillRect(i, j, 2, 2);
        }
      }
    }

    // Draw center area
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 50;

    // Draw direction indicator
    const direction = gameState.direction;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.stroke();

    // Arrow for direction
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(direction === 1 ? '↻' : '↺', 0, -120);
    ctx.restore();

    // Draw draw pile
    const drawPileX = centerX - 70;
    const drawPileY = centerY;

    // Stack effect for draw pile
    for (let i = 0; i < Math.min(5, gameState.drawPile.length); i++) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      renderCard(ctx, gameState.drawPile[i], {
        x: drawPileX + i * 2,
        y: drawPileY - i * 2,
        faceDown: true,
      });
      ctx.restore();
    }

    // Draw pile click area indicator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.rect(
      drawPileX - CARD_WIDTH / 2 - 5,
      drawPileY - CARD_HEIGHT / 2 - 5,
      CARD_WIDTH + 10,
      CARD_HEIGHT + 10
    );
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw discard pile
    const discardPileX = centerX + 70;
    const discardPileY = centerY;

    // Show last few cards with slight offset
    const discardShow = gameState.discardPile.slice(-3);
    discardShow.forEach((card, i) => {
      const offset = (i - discardShow.length + 1) * 3;
      const rotation = (i - discardShow.length + 1) * 0.1;
      renderCard(ctx, card, {
        x: discardPileX + offset,
        y: discardPileY + offset,
        rotation,
      });
    });

    // Draw other players' hands (face down, around the table)
    const otherPlayers = gameState.players.filter((p) => p.id !== currentPlayerId);
    const positions = [
      { x: canvas.width / 2, y: 80, rotation: Math.PI }, // Top
      { x: 80, y: canvas.height / 2, rotation: Math.PI / 2 }, // Left
      { x: canvas.width - 80, y: canvas.height / 2, rotation: -Math.PI / 2 }, // Right
    ];

    otherPlayers.forEach((player, index) => {
      if (index >= positions.length) return;

      const pos = positions[index];
      const cardCount = player.hand.length;
      const spacing = 25;
      const totalWidth = (cardCount - 1) * spacing;
      const startOffset = -totalWidth / 2;

      // Draw player name
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.rotation);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(player.name, 0, -CARD_HEIGHT / 2 - 20);
      ctx.fillText(`(${cardCount} cards)`, 0, -CARD_HEIGHT / 2 - 5);

      // Highlight current player
      if (gameState.players[gameState.currentPlayerIndex].id === player.id) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('◆', 0, -CARD_HEIGHT / 2 - 35);
      }

      ctx.restore();

      // Draw their cards
      for (let i = 0; i < cardCount; i++) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.rotation);

        const cardX = startOffset + i * spacing;
        renderCard(ctx, player.hand[i], {
          x: cardX,
          y: 0,
          scale: 0.6,
          faceDown: true,
        });

        ctx.restore();
      }
    });

    // Draw current player's hand
    const handPositions = getHandPositions(canvas);
    cardPositionsRef.current = handPositions;

    // Sort so hovered card renders on top
    const sortedCards = [...hand].sort((a, b) => {
      if (hoveredCardRef.current === a.id) return 1;
      if (hoveredCardRef.current === b.id) return -1;
      return 0;
    });

    sortedCards.forEach((card) => {
      const pos = handPositions.get(card.id);
      if (!pos) return;

      const isValid = validMoves.includes(card.id);
      const isHovered = hoveredCardRef.current === card.id;
      const yOffset = isHovered ? -30 : 0;
      const scaleBoost = isHovered ? 1.15 : 1;

      renderCard(ctx, card, {
        x: pos.x,
        y: pos.y + yOffset,
        rotation: pos.rotation,
        scale: pos.scale * scaleBoost,
        highlighted: isValid,
        glowColor: isValid ? '#FFD700' : undefined,
      });
    });

    // Draw player info
    if (currentPlayer) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        currentPlayer.name,
        canvas.width / 2,
        canvas.height - CARD_HEIGHT - 60
      );

      // Current turn indicator
      if (gameState.players[gameState.currentPlayerIndex].id === currentPlayerId) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Your Turn!', canvas.width / 2, canvas.height - CARD_HEIGHT - 80);
      }
    }

    // Draw stacked draw amount if any
    if (gameState.stackedDrawAmount > 0) {
      ctx.fillStyle = '#FF4444';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `+${gameState.stackedDrawAmount} stacked!`,
        centerX,
        centerY + CARD_HEIGHT / 2 + 30
      );
    }

    // Draw silence mode indicator
    if (gameState.silenceMode) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width - 200, 10, 190, 40);
      ctx.fillStyle = '#FF6B6B';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('🤫 SILENCE MODE', canvas.width - 20, 35);
    }

    // Request next frame
    requestAnimationFrame(render);
  }, [gameState, currentPlayerId, hand, validMoves, getHandPositions]);

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      mousePos.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };

      // Check if hovering over any card
      let foundHover = false;
      const positions = cardPositionsRef.current;

      // Check in reverse order (top cards first)
      const handReversed = [...hand].reverse();
      for (const card of handReversed) {
        const pos = positions.get(card.id);
        if (!pos) continue;

        const dx = mousePos.current.x - pos.x;
        const dy = mousePos.current.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < CARD_WIDTH / 2 + 10) {
          hoveredCardRef.current = card.id;
          foundHover = true;
          canvas.style.cursor = 'pointer';
          break;
        }
      }

      if (!foundHover) {
        hoveredCardRef.current = null;
        canvas.style.cursor = 'default';

        // Check if hovering over draw pile
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 - 50;
        const drawPileX = centerX - 70;
        const drawPileY = centerY;

        const dx = mousePos.current.x - drawPileX;
        const dy = mousePos.current.y - drawPileY;
        if (
          Math.abs(dx) < CARD_WIDTH / 2 + 5 &&
          Math.abs(dy) < CARD_HEIGHT / 2 + 5
        ) {
          canvas.style.cursor = 'pointer';
        }
      }
    },
    [hand]
  );

  // Handle click
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      // Check if clicking a card
      if (hoveredCardRef.current && onCardClick) {
        onCardClick(hoveredCardRef.current);
        return;
      }

      // Check if clicking draw pile
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 50;
      const drawPileX = centerX - 70;
      const drawPileY = centerY;

      const dx = clickX - drawPileX;
      const dy = clickY - drawPileY;
      if (
        Math.abs(dx) < CARD_WIDTH / 2 + 5 &&
        Math.abs(dy) < CARD_HEIGHT / 2 + 5 &&
        onDeckClick
      ) {
        onDeckClick();
      }
    },
    [onCardClick, onDeckClick]
  );

  // Setup canvas and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const updateSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = Math.min(container.clientWidth, 1200);
        canvas.height = Math.min(container.clientHeight, 800);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Start render loop
    requestAnimationFrame(render);

    // Add event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', updateSize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [render, handleMouseMove, handleClick]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ maxWidth: '1200px', maxHeight: '800px' }}
    />
  );
}
