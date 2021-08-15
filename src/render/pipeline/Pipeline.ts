import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';

export interface PipelineShaderBlock {
  // void main()
  vert: string;
  // material(MaterialInfo mInfo)
  frag: string;
}

export interface Pipeline {
  dispose(): void;
  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader;
  drawDeferred(options: DrawOptions): void;
  drawForward(options: DrawOptions): void;
  render(): void;
}
