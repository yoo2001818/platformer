import {EntityChunk} from '../core/EntityChunk';

import {GLGeometry} from './gl/GLGeometry';
import {GLShader} from './gl/GLShader';
import {DrawOptions} from './gl/types';
import {Renderer} from './Renderer';

export interface MaterialVertexShaderBlock {
  vert: string;
}

export interface Material {
  id: number;
  mode: 'forward' | 'deferred';
  renderVertex?(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    onGetShader: (
      id: string,
      onCreate: (defines?: string) => MaterialVertexShaderBlock,
    ) => GLShader,
    onDraw: (options: DrawOptions) => void,
  ): void;
  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void;
  dispose(): void;
}
