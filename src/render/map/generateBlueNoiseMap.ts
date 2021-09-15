import {GLTexture2D} from '../gl/GLTexture2D';
import {createImage} from '../utils/createImage';

import {BLUE_NOISE_URL} from './blueNoiseData';

let texture: GLTexture2D | null = null;

export function generateBlueNoiseMap(): GLTexture2D {
  if (texture != null) {
    return texture;
  }
  texture = new GLTexture2D({
    type: 'halfFloat',
    format: 'rgba',
    minFilter: 'nearest',
    magFilter: 'nearest',
    mipmap: false,
    width: 128,
    height: 128,
    source: createImage(BLUE_NOISE_URL),
  });
  return texture;
}
