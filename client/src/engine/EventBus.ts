import type { GameEventType } from '../types/game.types';

type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  private listeners: Map<GameEventType, Set<EventHandler>> = new Map();

  on<T = unknown>(event: GameEventType, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  off<T = unknown>(event: GameEventType, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }

  emit<T = unknown>(event: GameEventType, payload: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  removeAllListeners(event?: GameEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
