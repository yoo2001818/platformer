/* eslint-disable @typescript-eslint/no-var-requires */
import {mat4} from 'gl-matrix';

import {calcNormals} from '../geom/calcNormals';
import {box} from '../geom/box';
import {quad} from '../geom/quad';
// import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
// import {parseObj} from '../geom/loader/obj';
import {GLGeometry} from '../render/gl/GLGeometry';
import {GLShader} from '../render/gl/GLShader';
import {GLVertexArray} from '../render/gl/GLVertexArray';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {Renderer} from '../render/gl/Renderer';
import {GLArrayBuffer} from '../render/gl/GLArrayBuffer';
import {createImage} from '../render/utils/createImage';

// import monkey from './monkey.obj';
import logo from './logo.png';
import { GLTextureCube } from '../render/gl/GLTextureCube';

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
  const skyShader = new GLShader(`
    #version 100
    precision lowp float;

    attribute vec3 aPosition;

    varying vec2 vPosition;

    void main() {
      vPosition = aPosition.xy;
      gl_Position = vec4(aPosition.xy, 1.0, 1.0);
    }
  `, `
    #version 100
    precision lowp float;

    varying vec2 vPosition;

    uniform samplerCube uTexture;
    uniform mat4 uInverseView;
    uniform mat4 uInverseProjection;

    void main() {
      vec4 proj = (uInverseView * uInverseProjection * vec4(vPosition.xy, 1.0, 1.0));
      vec3 dir = normalize(proj.xyz / proj.w);
      gl_FragColor = vec4(textureCube(uTexture, dir).xyz, 1.0);
    }
  `);

  const geometry = new GLGeometry(calcNormals(box()));

  const skyGeom = new GLGeometry(quad());
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

  const skyVao = new GLVertexArray();
  skyVao.bind(renderer);
  skyShader.bind(renderer);
  skyGeom.bind(renderer, skyShader);

  // shader.setAttributeStatic('aColor', [0, 0, 1, 1]);

  const texture = new GLTexture2D({source: createImage(logo)});
  const skyTexture = new GLTextureCube({
    sources: [
      createImage(require('./sky1.png')),
      createImage(require('./sky2.png')),
      createImage(require('./sky3.png')),
      createImage(require('./sky4.png')),
      createImage(require('./sky5.png')),
      createImage(require('./sky6.png')),
    ],
  });

  gl!.enable(gl!.DEPTH_TEST);
  gl!.depthFunc(gl!.LEQUAL);

  function update(delta: number): void {
    const uProjection = mat4.create();
    mat4.perspective(
      uProjection,
      70 / 180 * Math.PI,
      800 / 600,
      0.1,
      1000,
    );

    const uView = mat4.create();
    mat4.translate(uView, uView, [0, 0, -25]);
    mat4.rotateX(uView, uView, Math.PI * delta / 2000);
    mat4.rotateY(uView, uView, Math.PI * delta / 3000);

    const uModel = mat4.create();

    const uInverseProjection = mat4.create();
    mat4.invert(uInverseProjection, uProjection);

    const uInverseView = mat4.create();
    mat4.invert(uInverseView, uView);

    vao.bind(renderer);
    shader.bind(renderer);
    geometry.bind(renderer, shader);
    shader.setAttribute('aInstanced', {buffer: instanceVbo, divisor: 1});
    shader.setUniforms({
      uProjection,
      uView,
      uModel,
      uTexture: texture,
    });
    gl!.enable(gl!.CULL_FACE);
    geometry.drawInstanced(100);

    skyVao.bind(renderer);
    skyShader.bind(renderer);
    skyGeom.bind(renderer, shader);
    skyShader.setUniforms({
      uInverseProjection,
      uInverseView,
      uTexture: skyTexture,
    });
    gl!.disable(gl!.CULL_FACE);
    skyGeom.draw();

    requestAnimationFrame(update);
  }

  update(0);
}

main();
