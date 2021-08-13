import {GLRenderer} from '../gl/GLRenderer';
import {GLTextureOptions} from '../gl/GLTexture';

export type HDRType = 'float' | 'rgbe';

export function getHDRType(renderer: GLRenderer): HDRType {
  if (
    renderer.floatTexExt &&
    renderer.floatTexLinearExt &&
    renderer.floatBufferExt
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
      };
    default:
      throw new Error(`Unknown HDR type ${type}`);
  }
}
