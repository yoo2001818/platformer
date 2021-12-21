import {EntityChunk} from '../core/EntityChunk';

import {GLGeometry} from './gl/GLGeometry';
import {GLShader} from './gl/GLShader';
import {DrawOptions} from './gl/types';
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

// In order to merge renderShadow and render, we can separate it in two steps

interface MaterialV2 {
  renderVertex(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    onGetShader: (id: string, vert: string) => GLShader,
    onDraw: (options: DrawOptions) => void,
  ): void;
  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void;
}
