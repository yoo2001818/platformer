import {Engine} from '../../core/Engine';
import {GizmoEffect} from '../../render/effect/GizmoEffect';

export interface EditorMode {
  bind(engine: Engine): void;
  destroy(): void;
  update(deltaTime?: number): void;
  processEvent(type: string, ...args: any[]): void;
  getEffects(): GizmoEffect[];
}
