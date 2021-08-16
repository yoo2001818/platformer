import {WEBGL2_TEXTURE_FORMAT_MAP} from './index';

export function getWebGL2InternalFormat(
  type: string,
  format: string,
): keyof typeof WEBGL2_TEXTURE_FORMAT_MAP {
  // https://www.khronos.org/registry/webgl/specs/latest/2.0/
  switch (format) {
    case 'rgb':
    case 'rgbInteger':
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
        case 'byte':
          return 'rgb8i';
        case 'unsignedShort':
          return 'rgb16ui';
        case 'short':
          return 'rgb16i';
        case 'unsignedInt':
          return 'rgb32ui';
        case 'int':
          return 'rgb32i';
        default:
          break;
      }
      break;
    case 'rgba':
    case 'rgbaInteger':
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
        case 'byte':
          return 'rgba8i';
        case 'unsignedShort':
          return 'rgba16ui';
        case 'short':
          return 'rgba16i';
        case 'unsignedInt':
          return 'rgba32ui';
        case 'int':
          return 'rgba32i';
        default:
          break;
      }
      break;
    case 'red':
    case 'redInteger':
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
    case 'rgInteger':
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
      switch (type) {
        case 'unsignedShort':
          return 'depthComponent16';
        case 'unsignedInt':
          return 'depthComponent24';
        case 'float':
          return 'depthComponent32f';
        default:
          break;
      }
      break;
    case 'depthStencil':
      switch (type) {
        case 'unsignedInt248':
          return 'depth24stencil8';
        case 'float32unsignedInt248rev':
          return 'depth32fstencil8';
        default:
          break;
      }
      break;
    default:
      break;
  }
  throw new Error(`Unknown format ${format} / ${type}`);
}
