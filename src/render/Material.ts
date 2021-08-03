import {EntityChunk} from '../core/EntityChunk';

import {GLGeometry} from './gl/GLGeometry';
import {Renderer} from './Renderer';

export interface Material {
  id: number;
  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void;
  dispose(): void;
}
