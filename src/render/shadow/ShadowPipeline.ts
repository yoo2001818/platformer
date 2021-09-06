import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';
import {PipelineShadowShaderBlock} from '../pipeline/Pipeline';
import {ShadowMapHandle} from '../ShadowMapManager';

export interface ShadowPipeline {
  type: string;
  getShader(id: string, onCreate: () => PipelineShadowShaderBlock): GLShader;
  begin(handle: ShadowMapHandle): void;
  draw(options: DrawOptions): void;
  finalize(): void;
}
