import {mat4} from 'gl-matrix';

import {calcNormals} from '../geom/calcNormals';
import {box} from '../geom/box';
// import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
// import {parseObj} from '../geom/loader/obj';
import {GLGeometry} from '../render/gl/GLGeometry';
import {GLShader} from '../render/gl/GLShader';
import {GLVertexArray} from '../render/gl/GLVertexArray';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {Renderer} from '../render/gl/Renderer';
import {GLArrayBuffer} from '../render/gl/GLArrayBuffer';

// import monkey from './monkey.obj';
import logo from './logo.png';
import { createImage } from '../render/utils/createImage';

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
  const shader = new GLShader(`
    #version 100
    precision lowp float;

    attribute vec3 aPosition;
    attribute vec2 aTexCoord;
    attribute vec3 aInstanced;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;

    varying vec2 vTexCoord;

    void main() {
      gl_Position = uProjection * uView * uModel * vec4(aPosition + aInstanced, 1.0);
      vTexCoord = aTexCoord;
    }
  `, `
    #version 100
    precision lowp float;

    varying vec2 vTexCoord;

    uniform sampler2D uTexture;

    void main() {
      gl_FragColor = vec4(texture2D(uTexture, vTexCoord).rgb, 1.0);
    }
  `);

  const geometry = new GLGeometry(calcNormals(box()));
  // const geometry = new GLGeometry(calcNormals(bakeChannelGeom(parseObj(monkey)[0].geometry)));

  const instanceVbo = new GLArrayBuffer(Array.from({length: 100}, () => [
    Math.random() * 20 - 10,
    Math.random() * 20 - 10,
    Math.random() * 20 - 10,
  ]));

  const vao = new GLVertexArray();
  vao.bind(renderer);
  shader.bind(renderer);
  geometry.bind(renderer, shader);
  shader.setAttribute('aInstanced', {buffer: instanceVbo, divisor: 1});
  // shader.setAttributeStatic('aColor', [0, 0, 1, 1]);

  const texture = new GLTexture2D({source: createImage(logo)});

  gl!.enable(gl!.CULL_FACE);
  gl!.enable(gl!.DEPTH_TEST);

  function update(delta: number): void {
    vao.bind(renderer);

    const uProjection = mat4.create();
    mat4.perspective(
      uProjection,
      70 / 180 * Math.PI,
      800 / 600,
      0.1,
      1000,
    );

    const uView = mat4.create();
    mat4.translate(uView, uView, [0, 0, -20]);

    const uModel = mat4.create();
    mat4.translate(uModel, uModel, [0, 0, -5]);
    mat4.rotateX(uModel, uModel, Math.PI * delta / 2000);
    mat4.rotateY(uModel, uModel, Math.PI * delta / 3000);

    shader.setUniforms({
      uProjection,
      uView,
      uModel,
      uTexture: texture,
    });

    geometry.drawInstanced(100);
    requestAnimationFrame(update);
  }

  update(0);
}

main();
