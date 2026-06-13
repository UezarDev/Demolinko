// src/ui/UIScreen.ts - Base interface for all fullscreen UI screens.
export interface UIScreen {
  id: string;
  show(data?: any): void;
  hide(): void;
}
