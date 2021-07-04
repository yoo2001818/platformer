import {Material} from './Material';
import {Geometry} from './Geometry';

export interface Mesh {
  material: Material | string;
  geometry: Geometry | string;
}
