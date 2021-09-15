export interface DeferredEffect {
  render(deltaTime?: number): void;
}
