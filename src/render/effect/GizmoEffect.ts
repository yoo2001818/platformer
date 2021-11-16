import {Renderer} from '../Renderer';

export interface GizmoEffect {
  bind(renderer: Renderer): void;
  render(deltaTime?: number): void;
  dispose(): void;
}

