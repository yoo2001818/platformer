import {Entity} from '../../core/Entity';
import {GizmoEffect} from '../../render/effect/GizmoEffect';
import {Light} from '../../render/light/Light';
import {Renderer} from '../../render/Renderer';

export interface GizmoLightEffectProps {
  selectedEntity: Entity | null;
}

export class GizmoLightEffect implements GizmoEffect<GizmoLightEffectProps> {
  renderer: Renderer | null = null;

  bind(renderer: Renderer): void {
    this.renderer = renderer;
  }

  render(props: GizmoLightEffectProps, deltaTime?: number): void {
    const {selectedEntity} = props;
    const renderer = this.renderer;
    if (renderer == null) {
      return;
    }
    const {entityStore} = renderer;
    // We could group each light into types and implement instancing...
    entityStore.forEachWith(['light', 'transform'], (entity) => {
      const light = entity.get<Light>('light');
      light?.renderGizmo?.(
        [entity],
        renderer,
        selectedEntity === entity ? '#FF4800' : '#000000',
      );
    });
  }

  dispose(): void {
  }

}
