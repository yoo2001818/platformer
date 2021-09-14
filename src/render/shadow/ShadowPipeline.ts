import {AtlasItem} from '../Atlas';
import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';
import {PipelineShadowShaderBlock} from '../pipeline/Pipeline';

export interface ShadowPipeline {
  type: string;
  getShader(id: string, onCreate: () => PipelineShadowShaderBlock): GLShader;
  begin(atlas: AtlasItem, uniforms: {[key: string]: unknown;}): void;
  draw(options: DrawOptions): void;
  finalize(): void;
}
