import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';

export interface PipelineShaderBlock {
  // void main()
  vert: string;
  // material(MaterialInfo mInfo)
  frag: string;
}

export interface PipelineShadowShaderBlock {
  vert: string;
}

export interface PipelineShadowOptions extends Partial<DrawOptions> {
}

export interface Pipeline {
  dispose(): void;
  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader;
  getForwardShader(id: string, onCreate: () => PipelineShaderBlock): GLShader;
  getShadowShader(id: string, onCreate: () => PipelineShadowShaderBlock): GLShader;
  drawDeferred(options: DrawOptions): void;
  drawForward(options: DrawOptions): void;
  drawShadow(options: PipelineShadowOptions): void;
  renderShadow(options: PipelineShadowOptions): void;
  render(): void;
}
