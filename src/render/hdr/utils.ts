import {GLRenderer} from '../gl/GLRenderer';
import {GLTextureOptions} from '../gl/GLTexture';

export type HDRType = 'float' | 'halfFloat' | 'halfFloatManual' | 'rgbe';

export function getHDRType(renderer: GLRenderer): HDRType {
  const {capabilities} = renderer;
  if (
    capabilities.hasHalfFloatTexture() &&
    capabilities.hasHalfFloatTextureLinear() &&
    capabilities.hasHalfFloatBuffer()
  ) {
    if (capabilities.hasLOD()) {
      return 'halfFloat';
    } else {
      return 'halfFloatManual';
    }
  }
  if (
    capabilities.hasFloatTexture() &&
    capabilities.hasFloatTextureLinear() &&
    capabilities.hasFloatBuffer() &&
    capabilities.hasLOD()
  ) {
    return 'float';
  }
  return 'rgbe';
}

export function getHDROptions(type: HDRType): GLTextureOptions {
  const defaultOptions: GLTextureOptions = {
    mipmap: false,
    wrapS: 'clampToEdge',
    wrapT: 'clampToEdge',
    anistropic: 0,
  };
  switch (type) {
    case 'halfFloat':
      return {
        ...defaultOptions,
        magFilter: 'linear',
        minFilter: 'linear',
        // NOTE: WebGL can't render to RGB16F. However it can render to this:
        format: 'rgba',
        type: 'halfFloat',
      };
    case 'halfFloatManual':
      return {
        ...defaultOptions,
        magFilter: 'nearest',
        minFilter: 'nearest',
        // NOTE: WebGL can't render to RGB16F. However it can render to this:
        format: 'rgba',
        type: 'halfFloat',
      };
    case 'float':
      return {
        ...defaultOptions,
        magFilter: 'linear',
        minFilter: 'linear',
        // NOTE: WebGL can't render to RGB32F. However it can render to this:
        format: 'rgba',
        type: 'float',
      };
    case 'rgbe':
      return {
        ...defaultOptions,
        magFilter: 'nearest',
        minFilter: 'nearest',
        format: 'rgba',
        type: 'unsignedByte',
      };
    default:
      throw new Error(`Unknown HDR type ${type}`);
  }
}
