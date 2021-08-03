import {EntityChunk} from '../core/EntityChunk';

import {Geometry} from './Geometry';
import {Material} from './Material';
import {Renderer} from './Renderer';

export class Mesh {
  material: Material;
  geometry: Geometry;

  constructor(material: Material, geometry: Geometry) {
    this.material = material;
    this.geometry = geometry;
  }

  render(chunk: EntityChunk, renderer: Renderer): void {
    const glGeometry = this.geometry.getGLGeometry(renderer);
    this.material.render(chunk, glGeometry, renderer);
  }
}
