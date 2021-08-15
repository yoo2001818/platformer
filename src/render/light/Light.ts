import {Entity} from '../../core/Entity';
import {Renderer} from '../Renderer';

export interface LightShaderBlock {
  header: string;
  body: string;
}

export interface Light {
  type: string;
  getShaderBlock(numLights: number, renderer: Renderer): LightShaderBlock;
  getUniforms(entities: Entity[], renderer: Renderer): {[key: string]: unknown;};
  prepare(entities: Entity[], renderer: Renderer): void;
}
