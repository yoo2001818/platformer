import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';
import {ShadowPipeline} from '../shadow/ShadowPipeline';

export interface PipelineShaderBlock {
  // void main()
  vert: string;
  // material(MaterialInfo mInfo)
  frag: string;
}

export interface PipelineShadowShaderBlock {
  vert: string;
}

export interface Pipeline {
  dispose(): void;
  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader;
  getForwardShader(id: string, onCreate: () => PipelineShaderBlock): GLShader;
  drawDeferred(options: DrawOptions): void;
  drawForward(options: DrawOptions): void;
  renderShadow(shadowPipeline: ShadowPipeline): void;
  render(deltaTime?: number): void;
}
