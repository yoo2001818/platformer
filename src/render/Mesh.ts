import {Material} from './Material';

export interface Mesh {
  material: Material | string;
  geometry: string;
}
