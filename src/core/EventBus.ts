// src/core/EventBus.ts - Type-safe Event Bus for decoupled component-to-component communication.

type EventCallback<T = any> = (data: T) => void;

export class EventBus {
  private static listeners: Map<string, EventCallback[]> = new Map();

  /**
   * Registers a callback listener to the specified event.
   */
  public static on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unregisters a callback listener from the specified event.
   */
  public static off(event: string, callback: EventCallback): void {
    const list = this.listeners.get(event);
    if (!list) return;
    const index = list.indexOf(callback);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  /**
   * Dispatches an event payload to all registered listeners.
   */
  public static emit(event: string, data?: any): void {
    const list = this.listeners.get(event);
    if (list) {
      for (const cb of list) {
        cb(data);
      }
    }
  }
}
