import {GeometryBuilder} from '../channelGeom/GeometryBuilder';
import {ChannelGeometryOptions} from '../channelGeom/types';

const POSITION = 0;
const NORMAL = 1;
const TEXCOORD = 2;

export interface ObjEntity {
  name: string;
  geometry: ChannelGeometryOptions;
}

export function parseObj(input: string): ObjEntity[] {
  const output: ObjEntity[] = [];
  let objectName: string | null = null;
  const builder = new GeometryBuilder();
  builder.clearAttributes(['aPosition', 'aNormal', 'aTexCoord'], [3, 3, 2]);
  input.split('\n').forEach((line) => {
    if (line[0] === '#') {
      return;
    }
    const words = line.trim().split(/\s+/g);
    // o -> Object
    // v -> aPosition
    // vt -> aTexCoord
    // vn -> aNormal
    // vp -> Not sure
    // f -> Indices
    // mtllib
    // usemtl
    // s off -> Normal smoothing
    switch (words[0]) {
      case 'v': {
        // Vertex coords: v 0 0 0
        const x = parseFloat(words[1]);
        const y = parseFloat(words[2]);
        const z = parseFloat(words[3]);
        builder.addAttribute(POSITION, [x, y, z]);
        break;
      }
      case 'vn': {
        // Normals: vn 0 0 0
        const x = parseFloat(words[1]);
        const y = parseFloat(words[2]);
        const z = parseFloat(words[3]);
        builder.addAttribute(NORMAL, [x, y, z]);
        break;
      }
      case 'vt': {
        // TexCoords: vt 0 0
        const x = parseFloat(words[1]);
        const y = parseFloat(words[2]);
        builder.addAttribute(TEXCOORD, [x, y]);
        break;
      }
      case 'p':
        // Point
        break;
      case 'l':
        // Line
        break;
      case 'f': {
        // Face: f 0/0/0 0/0/0 0/0/0
        // Arbitrary amount of points are possible; we must triangluate them
        const points = words.slice(1).map((arg) => {
          const [pos, tex, normal] = arg.split('/');
          return [
            parseInt(pos, 10) - 1,
            parseInt(normal, 10) - 1,
            parseInt(tex, 10) - 1,
          ];
        });
        builder.addFace(points);
        break;
      }
      case 'o': {
        // Finalize object if exists; otherwise specify its name
        if (builder.faces.length > 0) {
          // Finalize the object and convert it to ECS entity
          output.push({
            name: objectName!,
            geometry: builder.toChannelGeometry(),
          });
        }
        objectName = words.slice(1).join(' ');
        builder.clearFaces();
        break;
      }
      case 'usemtl':
        // Nothing yet..
        break;
      case 'g':
        // Put the object in group if exists
        break;
      case 's':
        // Smoothing: s off / s 0 / s on / s 1
        break;
      default:
    }
  });
  // Finalize the object
  if (builder.faces.length > 0) {
    // Finalize the object and convert it to ECS entity
    output.push({
      name: objectName!,
      geometry: builder.toChannelGeometry(),
    });
  }
  return output;
}
