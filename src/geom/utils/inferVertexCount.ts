import {GeometryOptions} from '../types';

export function inferVertexCount(geomOptions: GeometryOptions): number {
  if (geomOptions.count != null) {
    return geomOptions.count;
  }
  // TODO: Don't assume triangles
  if (geomOptions.indices != null) {
    return geomOptions.indices.length / 3;
  }
  let size = 0;
  Object.keys(geomOptions.attributes).forEach((name) => {
    const attribute = geomOptions.attributes[name];
    size = attribute.data.length / attribute.size;
  });
  return size / 3;
}
