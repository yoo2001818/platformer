import {UnisonComponent} from '../core/components/UnisonComponent';
import {Entity} from '../core/Entity';
import {EntityChunk} from '../core/EntityChunk';

import {Mesh} from './Mesh';

export class MeshComponent extends UnisonComponent<Mesh> {
  constructor() {
    super(
      (mesh) => mesh.geometries.map((geometry, index) => {
        const materialIndex = Math.min(mesh.materials.length - 1, index);
        const material = mesh.materials[materialIndex];
        return `${geometry.id}_${material?.id}`;
      }).join('/'),
      (mesh) => mesh.clone(),
    );
  }

  set(entity: Entity, value: Mesh): void {
    super.set(entity, value);
  }

  initChunk(chunk: EntityChunk, value: Mesh | null): void {
    super.initChunk(chunk, value);
  }
}
