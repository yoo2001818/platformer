import {Material} from './Material';
import {Geometry} from './geometry/Geometry';

export interface Mesh {
  material: Material | string;
  geometry: Geometry | string;
}
