import {UnisonComponent} from '../core/components/UnisonComponent';

import {Mesh} from './Mesh';

export class MeshComponent extends UnisonComponent<Mesh> {
  constructor() {
    super((mesh) => `${mesh.geometry.id}_${mesh.material.id}`);
  }
}
