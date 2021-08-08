import {UnisonComponent} from '../core/components/UnisonComponent';

import {Mesh} from './Mesh';

export class MeshComponent extends UnisonComponent<Mesh> {
  constructor() {
    super((mesh) => mesh.geometries.map((geometry, index) => {
      const materialIndex = Math.min(mesh.materials.length - 1, index);
      const material = mesh.materials[materialIndex];
      return `${geometry.id}_${material?.id}`;
    }).join('/'));
  }
}
