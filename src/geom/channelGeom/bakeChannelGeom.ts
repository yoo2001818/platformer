import {GeometryOptions} from '../types';

import {GeometryBuilder} from './GeometryBuilder';
import {ChannelGeometryOptions} from './types';

export function bakeChannelGeom(
  channelGeom: ChannelGeometryOptions,
): GeometryOptions {
  const builder = new GeometryBuilder();
  const names = Object.keys(channelGeom.attributes);
  builder.clearAttributes(
    names,
    names.map((name) => channelGeom.attributes[name].size),
  );
  // Insert each attribute
  names.forEach((name, index) => {
    const attribute = channelGeom.attributes[name];
    builder.addAttribute(index, Array.from(attribute.data));
  });
  // Insert each face
  builder.setFaces(channelGeom.indices);
  return builder.toGeometry();
}
