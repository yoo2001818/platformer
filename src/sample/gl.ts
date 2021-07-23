import {mat4} from 'gl-matrix';

import {calcNormals} from '../geom/calcNormals';
import {box} from '../geom/box';
// import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
// import {parseObj} from '../geom/loader/obj';
import {GLGeometry} from '../render/gl/GLGeometry';
import {GLShader} from '../render/gl/GLShader';
import {GLVertexArray} from '../render/gl/GLVertexArray';
import {GLTexture} from '../render/gl/GLTexture';
import {Renderer} from '../render/gl/Renderer';

// import monkey from './monkey.obj';
import logo from './logo.png';

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

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;

    varying vec2 vTexCoord;

    void main() {
      gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
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

  const vao = new GLVertexArray();
  vao.bind(renderer);
  shader.bind(renderer);
  geometry.bind(renderer, shader);
  // shader.setAttributeStatic('aColor', [0, 0, 1, 1]);

  const image = new Image();
  image.src = logo;
  const texture = new GLTexture({source: image});

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

    const uModel = mat4.create();
    mat4.translate(uModel, uModel, [0, 0, -5]);
    mat4.rotateX(uModel, uModel, Math.PI * delta / 1200);
    mat4.rotateY(uModel, uModel, Math.PI * delta / 1300);

    shader.setUniforms({
      uProjection,
      uView: mat4.create(),
      uModel,
      uTexture: texture,
    });

    gl!.enable(gl!.CULL_FACE);
    gl!.enable(gl!.DEPTH_TEST);
    geometry.draw();
    requestAnimationFrame(update);
  }

  update(0);
}

main();
