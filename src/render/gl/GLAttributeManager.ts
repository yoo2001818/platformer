import {Renderer} from './Renderer';
import {AttributeOptions} from './types';

interface AttributeData {
  enabled: boolean;
  divisor: number;
}

const ATTRIBUTE_TYPE_MAP = {
  byte: 0x1400,
  unsignedByte: 0x1401,
  short: 0x1402,
  unsignedShort: 0x1403,
  int: 0x1404,
  unsignedInt: 0x1405,
  float: 0x1406,
};

export class GLAttributeManager {
  renderer: Renderer;
  attributes: AttributeData[];

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.attributes = [];
  }

  init(): void {
    // Query available attributes and reset current state
    const {gl} = this.renderer;
    const numAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    this.attributes = [];
    for (let i = 0; i < numAttributes; i += 1) {
      this.attributes[i] = {enabled: false, divisor: 0};
    }
  }

  set(index: number, options: AttributeOptions): void {
    const {renderer, attributes} = this;
    const {gl, instanceExt} = renderer;
    const {
      buffer,
      size,
      type = buffer.dataType,
      normalized = false,
      stride = 0,
      offset = 0,
      divisor = 0,
    } = options;
    buffer.bind(renderer);
    if (type == null) {
      throw new Error('Attribute data type must be specified');
    }
    const attribute = attributes[index];
    if (!attribute.enabled) {
      gl.enableVertexAttribArray(index);
      attribute.enabled = true;
    }
    gl.vertexAttribPointer(
      index,
      size,
      ATTRIBUTE_TYPE_MAP[type],
      normalized,
      stride,
      offset,
    );
    if (attribute.divisor !== divisor) {
      if (instanceExt != null) {
        instanceExt.vertexAttribDivisorANGLE(index, divisor);
      }
    }
  }

  setStatic(index: number, array: Float32Array): void {
    const {renderer, attributes} = this;
    const {gl} = renderer;
    const attribute = attributes[index];
    if (attribute.enabled) {
      gl.disableVertexAttribArray(index);
      attribute.enabled = false;
    }
    switch (array.length) {
      case 1:
        gl.vertexAttrib1fv(index, array);
        break;
      case 2:
        gl.vertexAttrib2fv(index, array);
        break;
      case 3:
        gl.vertexAttrib3fv(index, array);
        break;
      case 4:
        gl.vertexAttrib4fv(index, array);
        break;
      default:
        throw new Error(`setStatic received an array length of ${array.length}`);
        break;
    }
  }
}
