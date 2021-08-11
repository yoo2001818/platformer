/* eslint-disable @typescript-eslint/no-extra-parens */
import {GLTexture2D} from '../gl/GLTexture2D';

export function generateHammersleyMap(samples: number): GLTexture2D {
  const data = new Uint8Array(samples * 3);
  for (let i = 0; i < samples; i += 1) {
    let bits = i;
    bits = (bits << 16) | (bits >> 16);
    bits = ((bits & 0x55555555) << 1) | ((bits & 0xAAAAAAAA) >>> 1);
    bits = ((bits & 0x33333333) << 2) | ((bits & 0xCCCCCCCC) >>> 2);
    bits = ((bits & 0x0F0F0F0F) << 4) | ((bits & 0xF0F0F0F0) >>> 4);
    bits = ((bits & 0x00FF00FF) << 8) | ((bits & 0xFF00FF00) >>> 8);
    let result = bits * 2.3283064365386963e-10;
    if (result < 0) {
      result += 1;
    }

    data[i * 4] = (result * 255) | 0;
    data[i * 4 + 1] = ((result * 255 * 255) % 256) | 0;
    data[i * 4 + 2] = ((result * 255 * 255 * 255) % 256) | 0;
    data[i * 4 + 3] = 0;
  }
  return new GLTexture2D({
    width: samples,
    height: 1,
    format: 'rgb',
    type: 'unsignedByte',
    magFilter: 'nearest',
    minFilter: 'nearest',
    mipmap: false,
    wrapS: 'clampToEdge',
    wrapT: 'clampToEdge',
    source: data,
  });
}
