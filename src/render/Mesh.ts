import {Geometry} from './Geometry';
import {Material} from './Material';

export interface Mesh {
  material: Material;
  geometry: Geometry;
}
