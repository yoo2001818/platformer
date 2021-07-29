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
import {GLArrayBuffer} from '../render/gl/GLArrayBuffer';
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

  const vao = new GLVertexArray();
  vao.bind(renderer);
  shader.bind(renderer);
  geometry.bind(renderer, shader);

  const texture = new GLTexture2D({source: createImage(logo)});

  gl!.enable(gl!.CULL_FACE);
  gl!.enable(gl!.DEPTH_TEST);
  gl!.depthFunc(gl!.LEQUAL);

  let lastTime = 0;

  function update(time: number) {
    const delta = time - lastTime;
    lastTime = time;
    for (let i = 0; i < 1; i += 1) {
      const entity = store.create();
      entity.set('pos', new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]));
      entity.set('vel', new Float32Array([
        (Math.random() * 2 - 1) * 20,
        (Math.random() * 2 - 1) * 20,
        (Math.random() * 2 - 1) * 20,
        1,
      ]));
    }

    store.forEachWith([posComp, velComp], (entity) => {
      const pos = posComp.get(entity)!;
      const vel = velComp.get(entity)!;
      pos[12] += vel[0] * delta / 1000;
      pos[13] += vel[1] * delta / 1000;
      pos[14] += vel[2] * delta / 1000;
      const boundary = 20;
      if (
        pos[12] < -boundary || pos[12] > boundary ||
        pos[13] < -boundary || pos[13] > boundary ||
        pos[14] < -boundary || pos[14] > boundary
      ) {
        entity.destroy();
      }
    });

    /*
    store.forEachChunkWith([posComp, velComp], (chunk) => {
      const pos = posComp.getChunkArray(chunk)!;
      const vel = velComp.getChunkArray(chunk)!;
      for (let i = 0; i < chunk.size; i += 1) {
        pos[i * 16 + 12] += vel[i * 4 + 0] * delta / 1000;
        pos[i * 16 + 13] += vel[i * 4 + 1] * delta / 1000;
        pos[i * 16 + 14] += vel[i * 4 + 2] * delta / 1000;
        const boundary = 20;
        if (
          chunk.isValid(i) &&
          (pos[i * 16 + 12] < -boundary || pos[i * 16 + 12] > boundary ||
          pos[i * 16 + 13] < -boundary || pos[i * 16 + 13] > boundary ||
          pos[i * 16 + 14] < -boundary || pos[i * 16 + 14] > boundary)
        ) {
          chunk.getAt(i)!.destroy();
        }
      }
    });
    */

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
    mat4.translate(uView, uView, [0, 0, -40]);
    mat4.rotateX(uView, uView, Math.PI * time / 2000);
    mat4.rotateY(uView, uView, Math.PI * time / 3000);

    const instancedBuffer = new GLArrayBuffer(null, 'stream');

    const chunkData = new Float32Array(2048 * 3);

    store.forEachChunkWith([posComp], (chunk) => {
      // Create chunk data...
      const posData = posComp.getChunkArray(chunk)!;
      let chunkPos = 0;
      chunk.forEach((_, offset) => {
        chunkData[chunkPos] = posData[offset * 16 + 12];
        chunkData[chunkPos + 1] = posData[offset * 16 + 13];
        chunkData[chunkPos + 2] = posData[offset * 16 + 14];
        chunkPos += 3;
      });
      instancedBuffer.set(chunkData);
      vao.bind(renderer);
      shader.bind(renderer);
      shader.setAttribute('aInstanced', {buffer: instancedBuffer, divisor: 1});
      shader.setUniforms({
        uProjection,
        uView,
        uModel: mat4.create(),
        uTexture: texture,
      });
      geometry.drawInstanced(chunk.size);
    });

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  update(0);
  console.log(store);
}

main();
