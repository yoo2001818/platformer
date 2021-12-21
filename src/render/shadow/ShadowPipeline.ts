import {AtlasItem} from '../Atlas';
import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';
import {MaterialVertexShaderBlock} from '../Material';

export interface ShadowPipeline {
  type: string;
  getShader(id: string, onCreate: () => MaterialVertexShaderBlock): GLShader;
  begin(atlas: AtlasItem, uniforms: {[key: string]: unknown;}): void;
  draw(options: DrawOptions): void;
  finalize(): void;
}
