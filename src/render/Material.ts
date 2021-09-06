import {EntityChunk} from '../core/EntityChunk';

import {GLGeometry} from './gl/GLGeometry';
import {Renderer} from './Renderer';
import {ShadowPipeline} from './shadow/ShadowPipeline';

export interface Material {
  id: number;
  mode: 'forward' | 'deferred';
  renderShadow?(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    shadowPipeline: ShadowPipeline,
  ): void;
  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void;
  dispose(): void;
}
