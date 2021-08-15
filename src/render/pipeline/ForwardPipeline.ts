import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';
import {Renderer} from '../Renderer';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

export class ForwardPipeline implements Pipeline {
  renderer: Renderer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  dispose(): void {

  }

  _collectLights(): void {

  }

  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader {
    const {renderer} = this;
    renderer.getResource(id, () => {
      onCreate();
    });
    throw new Error('Method not implemented.');
  }

  drawDeferred(options: DrawOptions): void {
    throw new Error('Method not implemented.');
  }

  render(): void {
    throw new Error('Method not implemented.');
  }

}
