import {DeferredPipeline} from './DeferredPipeline';

export class SSAO {
  pipeline: DeferredPipeline;

  constructor(pipeline: DeferredPipeline) {
    this.pipeline = pipeline;
  }

  render(): void {

  }
}
