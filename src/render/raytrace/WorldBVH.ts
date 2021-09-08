import { vec3 } from 'gl-matrix';
import {BVH, createBVH} from '../../3d/BVH';
import {TransformComponent} from '../../3d/TransformComponent';
import {Entity} from '../../core/Entity';
import {EntityStore} from '../../core/EntityStore';
import {MeshComponent} from '../MeshComponent';

export class WorldBVH {
  entityStore: EntityStore;
  bvh: BVH | null = null;

  constructor(entityStore: EntityStore) {
    this.entityStore = entityStore;
  }

  update(): void {
    // Try to build entities array with mesh
    const {entityStore} = this;
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform');
    const meshComp = entityStore.getComponent<MeshComponent>('mesh');
    const entities: Entity[] = [];
    entityStore.forEachWith(['transform', 'mesh'], (entity) => {
      entities.push(entity);
    });
    // Calculate mesh bounds
    const bounds = new Float32Array(entities.length * 6);
    const tmp = vec3.create();
    entities.forEach((entity, i) => {
      const transform = entity.get(transformComp)!;
      const mat = transform.getMatrixWorld();
      const mesh = entity.get(meshComp)!;
      mesh.getBoundPoints().forEach((point, j) => {
        // Transform local space to world space...
        vec3.transformMat4(tmp, point as vec3, mat);
        // Then calculate the bounds.
        if (j === 0) {
          for (let k = 0; k < 3; k += 1) {
            bounds[i * 6 + k] = point[k];
            bounds[i * 6 + 3 + k] = point[k];
          }
        } else {
          for (let k = 0; k < 3; k += 1) {
            bounds[i * 6 + k] = Math.min(point[k], bounds[i * 6 + k]);
            bounds[i * 6 + 3 + k] = Math.max(point[k], bounds[i * 6 + 3 + k]);
          }
        }
      });
    });
    // Generate BVH
    const bvh = createBVH(bounds);
    
  }
}
