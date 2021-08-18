import {EntityChunk} from '../core/EntityChunk';

import {GLGeometry} from './gl/GLGeometry';
import {PipelineShadowOptions} from './pipeline/Pipeline';
import {Renderer} from './Renderer';

export interface Material {
  id: number;
  mode: 'forward' | 'deferred';
  renderShadow?(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    options: PipelineShadowOptions,
  ): void;
  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void;
  dispose(): void;
}
