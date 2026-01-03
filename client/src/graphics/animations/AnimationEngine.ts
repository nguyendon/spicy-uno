export type EasingFunction = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,

  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

export interface Animation {
  id: string;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  update: (progress: number) => void;
  onComplete?: () => void;
}

export interface AnimatedValue {
  current: number;
  target: number;
  velocity: number;
}

export class AnimationEngine {
  private animations: Map<string, Animation> = new Map();
  private lastTimestamp: number = 0;

  addAnimation(animation: Animation): void {
    this.animations.set(animation.id, animation);
  }

  removeAnimation(id: string): void {
    this.animations.delete(id);
  }

  hasAnimation(id: string): boolean {
    return this.animations.has(id);
  }

  update(timestamp: number): void {
    this.lastTimestamp = timestamp;

    for (const [id, anim] of this.animations) {
      const elapsed = timestamp - anim.startTime;
      const rawProgress = Math.min(elapsed / anim.duration, 1);
      const easedProgress = anim.easing(rawProgress);

      anim.update(easedProgress);

      if (rawProgress >= 1) {
        anim.onComplete?.();
        this.animations.delete(id);
      }
    }
  }

  getTimestamp(): number {
    return this.lastTimestamp;
  }

  clear(): void {
    this.animations.clear();
  }

  get activeCount(): number {
    return this.animations.size;
  }
}

// Helper functions for common animation patterns
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function lerpPoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
  t: number
): { x: number; y: number } {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
  };
}

export function createCardPlayAnimation(
  engine: AnimationEngine,
  cardId: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  onUpdate: (x: number, y: number, scale: number, rotation: number) => void,
  onComplete?: () => void
): void {
  engine.addAnimation({
    id: `card-play-${cardId}`,
    startTime: performance.now(),
    duration: 400,
    easing: Easing.easeOutBack,
    update: (progress) => {
      const x = lerp(fromX, toX, progress);
      const y = lerp(fromY, toY, progress);
      const scale = 1 + Math.sin(progress * Math.PI) * 0.15;
      const rotation = lerp(0, Math.random() * 0.2 - 0.1, progress);
      onUpdate(x, y, scale, rotation);
    },
    onComplete,
  });
}

export function createCardDrawAnimation(
  engine: AnimationEngine,
  cardId: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  onUpdate: (x: number, y: number, scaleX: number, faceDown: boolean) => void,
  onComplete?: () => void
): void {
  engine.addAnimation({
    id: `card-draw-${cardId}`,
    startTime: performance.now(),
    duration: 300,
    easing: Easing.easeOutQuad,
    update: (progress) => {
      const x = lerp(fromX, toX, progress);
      const y = lerp(fromY, toY, progress);
      // Flip animation
      const scaleX = progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2;
      const faceDown = progress < 0.5;
      onUpdate(x, y, scaleX, faceDown);
    },
    onComplete,
  });
}

export function createPulseAnimation(
  engine: AnimationEngine,
  id: string,
  duration: number,
  onUpdate: (scale: number) => void,
  loop: boolean = false
): void {
  const startTime = performance.now();

  engine.addAnimation({
    id,
    startTime,
    duration,
    easing: Easing.easeInOutQuad,
    update: (progress) => {
      const scale = 1 + Math.sin(progress * Math.PI) * 0.1;
      onUpdate(scale);
    },
    onComplete: loop
      ? () => createPulseAnimation(engine, id, duration, onUpdate, true)
      : undefined,
  });
}

export function createShakeAnimation(
  engine: AnimationEngine,
  id: string,
  intensity: number,
  onUpdate: (offsetX: number, offsetY: number) => void,
  onComplete?: () => void
): void {
  engine.addAnimation({
    id,
    startTime: performance.now(),
    duration: 500,
    easing: Easing.easeOutQuad,
    update: (progress) => {
      const remaining = 1 - progress;
      const offsetX = (Math.random() - 0.5) * intensity * remaining;
      const offsetY = (Math.random() - 0.5) * intensity * remaining;
      onUpdate(offsetX, offsetY);
    },
    onComplete,
  });
}
