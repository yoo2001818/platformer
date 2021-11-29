import {Renderer} from '../Renderer';

export interface GizmoEffect<T> {
  bind(renderer: Renderer): void;
  render(options: T, deltaTime?: number): void;
  dispose(): void;
}

