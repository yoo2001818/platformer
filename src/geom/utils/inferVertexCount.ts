import {GeometryOptions} from '../types';

export function inferVertexCount(geomOptions: GeometryOptions): number {
  let size = 0;
  Object.keys(geomOptions.attributes).forEach((name) => {
    const attribute = geomOptions.attributes[name];
    size = attribute.data.length / attribute.size;
  });
  return size;
}
