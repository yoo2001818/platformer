import type {Renderer} from './Renderer';

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
      this.program = program;
    }
    if (renderer.boundShader !== this) {
      renderer.gl.useProgram(this.program);
      renderer.boundShader = this;
    }
  }
}
