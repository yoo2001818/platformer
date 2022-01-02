import {GizmoEffect} from '../../render/effect/GizmoEffect';
import {Light} from '../../render/light/Light';
import {Renderer} from '../../render/Renderer';

export interface GizmoLightEffectProps {
}

export class GizmoLightEffect implements GizmoEffect<GizmoLightEffectProps> {
  renderer: Renderer | null = null;

  bind(renderer: Renderer): void {
    this.renderer = renderer;
  }

  render(options: GizmoLightEffectProps, deltaTime?: number): void {
    const renderer = this.renderer;
    if (renderer == null) {
      return;
    }
    const {entityStore} = renderer;
    // We could group each light into types and implement instancing...
    entityStore.forEachWith(['light', 'transform'], (entity) => {
      const light = entity.get<Light>('light');
      light?.renderGizmo?.([entity], renderer);
    });
  }

  dispose(): void {
  }

}
