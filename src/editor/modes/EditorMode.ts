import {Engine} from '../../core/Engine';
import {RenderNode} from '../ModeState';
import {Viewport} from '../Viewport';

export interface EditorMode {
  bind(engine: Engine): void;
  destroy(): void;
  update(deltaTime?: number): void;
  processEvent(type: string, viewport: Viewport, ...args: any[]): void;
  getEffects(viewport: Viewport): RenderNode<any>[];
}
