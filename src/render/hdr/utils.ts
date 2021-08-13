import {GLRenderer} from '../gl/GLRenderer';
import {GLTextureOptions} from '../gl/GLTexture';

export type HDRType = 'float' | 'rgbe';

export function getHDRType(renderer: GLRenderer): HDRType {
  const {capabilities} = renderer;
  if (
    capabilities.hasFloatTexture() &&
    capabilities.hasFloatTextureLinear() &&
    capabilities.hasFloatBuffer()
  ) {
    return 'float';
  }
  return 'rgbe';
}

export function getHDROptions(type: HDRType): GLTextureOptions {
  switch (type) {
    case 'float':
      return {
        magFilter: 'linear',
        minFilter: 'linear',
        mipmap: false,
        // NOTE: WebGL can't render to RGB32F. However it can render to this:
        format: 'rgba',
        type: 'float',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        anistropic: 0,
      };
    case 'rgbe':
      return {
        magFilter: 'nearest',
        minFilter: 'nearest',
        mipmap: false,
        format: 'rgba',
        type: 'unsignedByte',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        anistropic: 0,
      };
    default:
      throw new Error(`Unknown HDR type ${type}`);
  }
}
