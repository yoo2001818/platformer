import {GLTexture} from '../gl/GLTexture';
import {Renderer} from '../Renderer';

export interface ProbeGridOptions {
  size: number[];
}

export interface ProbeGrid {
  setOptions(options: ProbeGridOptions): void;
  getTexture(): GLTexture;
  prepare(renderer: Renderer): void;
}
