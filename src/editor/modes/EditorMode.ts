import {Engine} from '../../core/Engine';

export interface EditorMode {
  bind(engine: Engine): void;
  destroy(): void;
  update(deltaTime?: number): void;
  processEvent(type: string, ...args: any[]): void;
}