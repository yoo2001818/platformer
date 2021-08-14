import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

export class ForwardPipeline implements Pipeline {
  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader {
    throw new Error('Method not implemented.');
  }

  drawDeferred(options: DrawOptions): void {
    throw new Error('Method not implemented.');
  }

  render(): void {
    throw new Error('Method not implemented.');
  }

}
