import type {Renderer} from './Renderer';
import {extractUniforms} from './uniform/extractUniforms';
import {extractAttributes} from './attribute/extractAttributes';
import {UniformEntry} from './uniform/types';
import {AttributeSlot} from './attribute/types';
import {setUniforms} from './uniform/setUniforms';
import {AttributeOptions} from './types';
import {convertFloatArray} from './uniform/utils';
import {GLArrayBuffer} from './GLArrayBuffer';

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

function getTypeSize(gl: WebGLRenderingContext, type: number): number {
  switch (type) {
    case gl.FLOAT:
      return 1;
    case gl.FLOAT_VEC2:
    case gl.INT_VEC2:
    case gl.BOOL_VEC2:
      return 2;
    case gl.FLOAT_VEC3:
    case gl.INT_VEC3:
    case gl.BOOL_VEC3:
      return 3;
    case gl.FLOAT_VEC4:
    case gl.INT_VEC4:
    case gl.BOOL_VEC4:
      return 4;
    case gl.FLOAT_MAT2:
      return 4;
    case gl.FLOAT_MAT3:
      return 9;
    case gl.FLOAT_MAT4:
      return 16;
    case gl.BOOL:
    case gl.BYTE:
    case gl.UNSIGNED_BYTE:
    case gl.SHORT:
    case gl.UNSIGNED_SHORT:
    case gl.INT:
    case gl.UNSIGNED_INT:
      return 1;
    default:
      throw new Error('Unsupported type');
  }
}

export class GLShader {
  vertCode: string;
  fragCode: string;
  renderer: Renderer | null = null;
  vertShader: WebGLShader | null = null;
  fragShader: WebGLShader | null = null;
  program: WebGLProgram | null = null;
  uniforms: UniformEntry | null = null;
  attributes: {[key: string]: AttributeSlot;} | null = null;

  constructor(
    vertCode: string,
    fragCode: string,
  ) {
    this.vertCode = vertCode;
    this.fragCode = fragCode;
  }

  bind(renderer: Renderer): void {
    if (this.program == null) {
      this.renderer = renderer;
      const {gl} = renderer;
      this.vertShader = compileShader(gl, gl.VERTEX_SHADER, this.vertCode);
      this.fragShader = compileShader(gl, gl.FRAGMENT_SHADER, this.fragCode);
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
      this.uniforms = extractUniforms(gl, program);
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
    if (options instanceof GLArrayBuffer) {
      renderer.attributeManager.set(attribute.location, {
        buffer: options,
        size: getTypeSize(gl, attribute.type),
      });
    } else {
      renderer.attributeManager.set(attribute.location, {
        ...options,
        size: getTypeSize(gl, attribute.type),
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
