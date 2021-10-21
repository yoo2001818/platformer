export interface GizmoEffect {
  render(deltaTime?: number): void;
  dispose(): void;
}

