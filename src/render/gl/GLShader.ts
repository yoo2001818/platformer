import type {Renderer} from './Renderer';
import {extractUniforms} from './uniform/extractUniforms';
import {extractAttributes} from './attribute/extractAttributes';
import {UniformEntry} from './uniform/types';
import {AttributeSlot} from './attribute/types';
import {setUniforms} from './uniform/setUniforms';
import {AttributeOptions} from './types';
import {convertFloatArray} from './uniform/utils';

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

  setAttribute(name: string, options: AttributeOptions): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not bound');
    }
    this.bind(renderer);
    const attribute = this.attributes![name];
    renderer.attributeManager.set(attribute.location, options);
  }

  setAttributeStatic(name: string, value: unknown): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not bound');
    }
    this.bind(renderer);
    const {gl} = renderer;
    const attribute = this.attributes![name];
    console.log(attribute);
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
