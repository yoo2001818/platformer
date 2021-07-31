import {GeometryOptions} from '../geom/types';

import {createId} from './utils/createId';

export class Geometry {
  id: number;
  options: GeometryOptions;
  constructor(options: GeometryOptions) {
    this.id = createId();
    this.options = options;
  }
}
