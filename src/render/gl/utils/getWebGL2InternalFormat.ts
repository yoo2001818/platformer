import {WEBGL2_TEXTURE_FORMAT_MAP} from './index';

export function getWebGL2InternalFormat(
  type: string,
  format: string,
): keyof typeof WEBGL2_TEXTURE_FORMAT_MAP {
  // https://www.khronos.org/registry/webgl/specs/latest/2.0/
  switch (format) {
    case 'rgb':
      switch (type) {
        case 'unsignedByte':
        case 'unsignedShort565':
          return 'rgb';
        case 'unsignedInt10F11F11F':
          return 'r11g11b10f';
        case 'halfFloat':
          return 'rgb16f';
        case 'float':
          return 'rgb32f';
        default:
          break;
      }
      break;
    case 'rgba':
      switch (type) {
        case 'unsignedByte':
        case 'unsignedShort4444':
        case 'unsignedShort5551':
          return 'rgba';
        case 'unsignedInt2101010':
          return 'rgb10a2';
        case 'halfFloat':
          return 'rgba16f';
        case 'float':
          return 'rgba32f';
        default:
          break;
      }
      break;
    case 'red':
      switch (type) {
        case 'unsignedByte':
          return 'r8';
        case 'halfFloat':
          return 'r16f';
        case 'float':
          return 'r32f';
        default:
          break;
      }
      break;
    case 'rg':
      switch (type) {
        case 'unsignedByte':
          return 'rg8';
        case 'halfFloat':
          return 'rg16f';
        case 'float':
          return 'rg32f';
        default:
          break;
      }
      break;
    case 'luminanceAlpha':
      return 'luminanceAlpha';
    case 'luminance':
      return 'luminance';
    case 'alpha':
      return 'alpha';
    case 'depth':
      return 'depth';
    case 'depthStencil':
      return 'depthStencil';
    default:
      break;
  }
  throw new Error(`Unknown format ${format} / ${type}`);
}
