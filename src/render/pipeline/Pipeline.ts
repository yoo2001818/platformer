import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';

export interface PipelineShaderBlock {
  vert?: string;
  frag: string;
}

export interface Pipeline {
  dispose(): void;
  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader;
  drawDeferred(options: DrawOptions): void;
  render(): void;
}
