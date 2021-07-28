import {mat4} from 'gl-matrix';

import {EntityStore} from '../core/EntityStore';
import {Float32ArrayComponent} from '../core/components';
import {calcNormals} from '../geom/calcNormals';
import {box} from '../geom/box';
// import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
// import {parseObj} from '../geom/loader/obj';
import {GLGeometry} from '../render/gl/GLGeometry';
import {GLShader} from '../render/gl/GLShader';
import {GLVertexArray} from '../render/gl/GLVertexArray';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {GLRenderer} from '../render/gl/GLRenderer';
import {createImage} from '../render/utils/createImage';

import logo from './logo.png';

const store = new EntityStore();

const posComp = new Float32ArrayComponent(16);
const velComp = new Float32ArrayComponent(4);

store.registerComponents({
  pos: posComp,
  vel: velComp,
});

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

  const renderer = new GLRenderer(gl);
  const shader = new GLShader(`
    #version 100
    precision lowp float;

    attribute vec3 aPosition;
    attribute vec2 aTexCoord;
    // attribute vec3 aInstanced;

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

  const vao = new GLVertexArray();
  vao.bind(renderer);
  shader.bind(renderer);
  geometry.bind(renderer, shader);

  const texture = new GLTexture2D({source: createImage(logo)});

  gl!.enable(gl!.CULL_FACE);
  gl!.enable(gl!.DEPTH_TEST);
  gl!.depthFunc(gl!.LEQUAL);

  function update(delta: number) {
    const entity = store.create();
    entity.set('pos', new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]));
    entity.set('vel', new Float32Array([
      (Math.random() * 2 - 1) * 0.2,
      (Math.random() * 2 - 1) * 0.2,
      (Math.random() * 2 - 1) * 0.2,
      1,
    ]));

    store.forEachWith([posComp, velComp], (entity, pos, vel) => {
      pos[12] += vel[0];
      pos[13] += vel[1];
      pos[14] += vel[2];
      const boundary = 10;
      if (
        pos[12] < -boundary || pos[12] > boundary ||
        pos[13] < -boundary || pos[13] > boundary ||
        pos[14] < -boundary || pos[14] > boundary
      ) {
        entity.destroy();
      }
    });

    store.sort();

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

    store.forEachWith([posComp], (entity, pos) => {
      vao.bind(renderer);
      shader.bind(renderer);
      shader.setUniforms({
        uProjection,
        uView,
        uModel: pos,
        uTexture: texture,
      });
      geometry.draw();
    });

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  update(0);
  console.log(store);
}

main();
