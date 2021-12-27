import {Entity} from '../../core/Entity';
import {DeferredPipeline} from '../pipeline/DeferredPipeline';
import {Renderer} from '../Renderer';

export interface LightShaderBlock {
  header: string;
  body: string;
}

export interface LightPipelineShaderBlock {
  vert: string;
  header: string;
  noperspective?: boolean;
  body: string;
}

export interface Light<T = any> {
  type: string;
  getOptions(): T;
  setOptions(value: T): void;
  getShaderBlock(numLights: number, renderer: Renderer): LightShaderBlock;
  getUniforms(entities: Entity[], renderer: Renderer): {[key: string]: unknown;};
  prepare(entities: Entity[], renderer: Renderer): void;
  renderDeferred?(
    entities: Entity[],
    renderer: Renderer,
    pipeline: DeferredPipeline,
  ): void;
  toJSON(): unknown;
  clone(): Light<T>;
}
