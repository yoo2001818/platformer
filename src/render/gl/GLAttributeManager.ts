import {GLRenderer} from './GLRenderer';
import {AttributeOptions} from './types';
import {ATTRIBUTE_TYPE_MAP} from './utils';

interface AttributeData {
  enabled: boolean;
  divisor: number;
}

export class GLAttributeManager {
  renderer: GLRenderer;
  attributes: AttributeData[];
  standardAttributes: string[];

  constructor(renderer: GLRenderer) {
    this.renderer = renderer;
    this.attributes = [];
    this.standardAttributes = [];
    this.init();
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

  setStandardAttributes(names: string[]): void {
    this.standardAttributes = names;
  }

  set(index: number, options: AttributeOptions): void {
    const {renderer, attributes} = this;
    const {gl, instanceExt} = renderer;
    const {
      buffer,
      size,
      normalized = false,
      stride = 0,
      offset = 0,
      divisor = 0,
    } = options;
    buffer.bind(renderer);
    const type = options.type ?? buffer.dataType;
    if (type == null) {
      throw new Error('Attribute data type must be specified');
    }
    if (size == null) {
      throw new Error('Attribute size must be specified ' +
        '(or set it through the shader)');
    }
    const attribute = attributes[index];

    // enableVertexAttribArray seems to be stored inside VAO...
    /*
    if (!attribute.enabled) {
      gl.enableVertexAttribArray(index);
      attribute.enabled = true;
    }
    */
    gl.enableVertexAttribArray(index);
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
