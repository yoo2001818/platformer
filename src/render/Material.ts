import {EntityChunk} from '../core/EntityChunk';

import {GLGeometry} from './gl/GLGeometry';
import {DrawOptions} from './gl/types';
import {Renderer} from './Renderer';

export interface Material {
  id: number;
  mode: 'forward' | 'deferred';
  renderDepth(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    options: DrawOptions,
  ): void;
  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void;
  dispose(): void;
}
