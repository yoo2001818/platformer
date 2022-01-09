import type {GLRenderer} from './GLRenderer';
import {extractUniforms} from './uniform/extractUniforms';
import {extractAttributes} from './attribute/extractAttributes';
import {UniformEntry, UniformSlot} from './uniform/types';
import {AttributeSlot} from './attribute/types';
import {setUniforms} from './uniform/setUniforms';
import {AttributeOptions} from './types';
import {convertFloatArray, step} from './uniform/utils';
import {GLArrayBuffer} from './GLArrayBuffer';
import {GLTexture} from './GLTexture';
import {convertShaderToWebGL2} from './utils/convertShaderToWebGL2';
import {TYPE_LENGTHS} from './utils';

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  code: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, code);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader)!);
  }
  return shader;
}

interface TypeData {
  size: number;
  numVectors: number;
}

function getTypeData(gl: WebGLRenderingContext, type: number): TypeData {
  switch (type) {
    case gl.FLOAT:
      return {size: 1, numVectors: 1};
    case gl.FLOAT_VEC2:
      return {size: 2, numVectors: 1};
    case gl.INT_VEC2:
      return {size: 2, numVectors: 1};
    case gl.BOOL_VEC2:
      return {size: 2, numVectors: 1};
    case gl.FLOAT_VEC3:
      return {size: 3, numVectors: 1};
    case gl.INT_VEC3:
      return {size: 3, numVectors: 1};
    case gl.BOOL_VEC3:
      return {size: 3, numVectors: 1};
    case gl.FLOAT_VEC4:
      return {size: 4, numVectors: 1};
    case gl.INT_VEC4:
      return {size: 4, numVectors: 1};
    case gl.BOOL_VEC4:
      return {size: 4, numVectors: 1};
    case gl.FLOAT_MAT2:
      return {size: 2, numVectors: 2};
    case gl.FLOAT_MAT3:
      return {size: 3, numVectors: 3};
    case gl.FLOAT_MAT4:
      return {size: 4, numVectors: 4};
    case gl.BOOL:
    case gl.BYTE:
    case gl.UNSIGNED_BYTE:
      return {size: 1, numVectors: 1};
    case gl.SHORT:
    case gl.UNSIGNED_SHORT:
      return {size: 1, numVectors: 1};
    case gl.INT:
    case gl.UNSIGNED_INT:
      return {size: 1, numVectors: 1};
    default:
      throw new Error('Unsupported type');
  }
}

export class GLShader {
  vertCode: string;
  fragCode: string;
  renderer: GLRenderer | null = null;
  vertShader: WebGLShader | null = null;
  fragShader: WebGLShader | null = null;
  program: WebGLProgram | null = null;
  uniforms: UniformEntry | null = null;
  textures: UniformSlot[] | null = null;
  attributes: {[key: string]: AttributeSlot;} | null = null;

  constructor(
    vertCode: string,
    fragCode: string,
  ) {
    this.vertCode = vertCode;
    this.fragCode = fragCode;
  }

  bind(renderer: GLRenderer): void {
    if (this.program == null) {
      this.renderer = renderer;
      const {gl, capabilities} = renderer;
      const vertCode = capabilities.isWebGL2
        ? convertShaderToWebGL2(this.vertCode, false)
        : this.vertCode;
      const fragCode = capabilities.isWebGL2
        ? convertShaderToWebGL2(this.fragCode, true)
        : this.fragCode;
      this.vertShader = compileShader(gl, gl.VERTEX_SHADER, vertCode);
      this.fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragCode);
      const program = gl.createProgram()!;
      // Bind standard attributes
      renderer.attributeManager.standardAttributes.forEach((name, index) => {
        gl.bindAttribLocation(program, index, name);
      });
      // Attach shaders
      gl.attachShader(program, this.vertShader);
      gl.attachShader(program, this.fragShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program)!);
      }
      const result = extractUniforms(gl, program);
      this.uniforms = result.uniforms;
      this.textures = result.textures;
      this.attributes = extractAttributes(gl, program);
      this.program = program;
    }
    if (renderer.boundShader !== this) {
      renderer.gl.useProgram(this.program);
      renderer.boundShader = this;
    }
  }

  dispose(): void {
    if (this.program != null) {
      const {program, vertShader, fragShader, renderer} = this;
      if (renderer == null) {
        return;
      }
      const {gl} = renderer;
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
      gl.deleteProgram(program);
      this.vertShader = null;
      this.fragShader = null;
      this.program = null;
      this.uniforms = null;
      this.attributes = null;
    }
  }

  hasUniform(name: string): boolean {
    if (this.uniforms == null) {
      throw new Error('Uniforms are not initialized');
    }
    return name in this.uniforms;
  }

  prepareUniformTextures(renderer: GLRenderer, uniforms: unknown): void {
    if (this.textures == null) {
      this.bind(renderer);
    }
    this.textures!.forEach((slot) => {
      const value = step(uniforms, slot.path);
      if (value != null && value instanceof GLTexture) {
        const texture = value as GLTexture;
        texture.prepare(renderer);
      }
    });
  }

  setUniforms(uniforms: unknown): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not bound');
    }
    this.bind(renderer);
    setUniforms(renderer, uniforms, this.uniforms!);
  }

  setAttribute(name: string, options: AttributeOptions | GLArrayBuffer): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not bound');
    }
    this.bind(renderer);
    const {gl} = renderer;
    const attribute = this.attributes![name];
    if (attribute == null) {
      return;
    }
    const typeData = getTypeData(gl, attribute.type);
    let setOptions: AttributeOptions;
    if (options instanceof GLArrayBuffer) {
      setOptions = {buffer: options};
    } else {
      setOptions = options;
    }
    const dataType = setOptions.type ?? setOptions.buffer.dataType;
    if (dataType == null) {
      throw new Error('dataType must be specified');
    }
    const byteSize = TYPE_LENGTHS[dataType] * typeData.size;
    const stride = setOptions.stride ?? byteSize * typeData.numVectors;
    const offset = setOptions.offset ?? 0;
    for (let i = 0; i < typeData.numVectors; i += 1) {
      renderer.attributeManager.set(attribute.location + i, {
        ...setOptions,
        size: typeData.size,
        offset: offset + byteSize * i,
        stride,
      });
    }
  }

  setAttributeStatic(name: string, value: unknown): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not bound');
    }
    this.bind(renderer);
    const {gl} = renderer;
    const attribute = this.attributes![name];
    let output: Float32Array;
    switch (attribute.type) {
      case gl.FLOAT:
        output = convertFloatArray(value, 1);
        break;
      case gl.FLOAT_VEC2:
        output = convertFloatArray(value, 2);
        break;
      case gl.FLOAT_VEC3:
        output = convertFloatArray(value, 3);
        break;
      case gl.FLOAT_VEC4:
        output = convertFloatArray(value, 4);
        break;
      default:
        throw new Error(`Unknown type ${attribute.type}`);
    }
    renderer.attributeManager.setStatic(attribute.location, output);
  }
}
