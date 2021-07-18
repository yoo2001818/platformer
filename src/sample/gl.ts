import {mat4} from 'gl-matrix';

import {GLArrayBuffer} from '../render/gl/GLArrayBuffer';
import { GLElementArrayBuffer } from '../render/gl/GLElementArrayBuffer';
import {GLShader} from '../render/gl/GLShader';
import {Renderer} from '../render/gl/Renderer';

function main() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');

  canvas.width = 800;
  canvas.height = 600;

  document.body.appendChild(canvas);

  if (gl == null) {
    alert('WebGL is not supported');
    return;
  }

  gl.viewport(0, 0, 800, 600);

  const renderer = new Renderer(gl);
  const quadBuffer = new GLArrayBuffer([
    // +---+
    // | / |
    // +---+
    -1, -1, 0,
    1, -1, 0,
    1, 1, 0,
    -1, 1, 0,
  ]);
  const colorBuffer = new GLArrayBuffer([
    // +---+
    // | / |
    // +---+
    1, 0, 0, 1,
    1, 1, 0, 1,
    0, 1, 1, 1,
    1, 0, 1, 1,
  ]);
  const elementBuffer = new GLElementArrayBuffer(new Uint8Array([
    0, 1, 2,
    3, 2, 0,
  ]));
  const shader = new GLShader(`
    #version 100
    precision lowp float;

    attribute vec3 aPosition;
    attribute vec4 aColor;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;

    varying vec4 vColor;

    void main() {
      gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
      vColor = aColor;
    }
  `, `
    #version 100
    precision lowp float;

    varying vec4 vColor;

    void main() {
      gl_FragColor = vColor;
    }
  `);

  shader.bind(renderer);
  shader.setAttribute('aPosition', {
    buffer: quadBuffer,
    size: 3,
    type: 'float',
  });
  shader.setAttribute('aColor', {
    buffer: colorBuffer,
    size: 4,
    type: 'float',
  });
  // shader.setAttributeStatic('aColor', [0, 0, 1, 1]);

  const uProjection = mat4.create();
  mat4.perspective(
    uProjection,
    70 / 180 * Math.PI,
    800 / 600,
    0.1,
    1000,
  );

  const uModel = mat4.create();
  mat4.translate(uModel, uModel, [0, 0, -5]);
  mat4.rotateX(uModel, uModel, Math.PI * 1.8);

  shader.setUniforms({
    uProjection,
    uView: mat4.create(),
    uModel,
  });

  elementBuffer.bind(renderer);
  gl.cullFace(gl.FRONT_AND_BACK);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
}

main();
