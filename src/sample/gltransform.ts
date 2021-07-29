import {mat4, vec3} from 'gl-matrix';

import {EntityStore} from '../core/EntityStore';
import {Float32ArrayComponent, ObjectComponent} from '../core/components';
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
import {TransformComponent} from '../3d/TransformComponent';
import {Transform} from '../3d/Transform';
import {Camera} from '../3d/Camera';

import logo from './logo.png';

const store = new EntityStore();

const posComp = new TransformComponent();
const velComp = new Float32ArrayComponent(4);
const cameraComp = new ObjectComponent<Camera>();

store.registerComponents({
  pos: posComp,
  vel: velComp,
  camera: cameraComp,
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

  const cameraEntity = store.create({
    pos: new Transform().translate([0, 0, 40]),
    camera: new Camera({
      type: 'perspective',
      fov: 70 / 180 * Math.PI,
      far: 1000,
      near: 0.1,
    }),
  });

  let lastTime = 0;

  function update(time: number) {
    const delta = time - lastTime;
    lastTime = time;
    for (let i = 0; i < 1; i += 1) {
      const entity = store.create();
      entity.set('pos', new Transform());
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
      pos.translate([
        vel[0] * delta / 1000,
        vel[1] * delta / 1000,
        vel[2] * delta / 1000,
      ]);
      const posVec = pos.getPosition();
      const boundary = 20;
      if (
        posVec[0] < -boundary || posVec[0] > boundary ||
        posVec[1] < -boundary || posVec[1] > boundary ||
        posVec[2] < -boundary || posVec[2] > boundary
      ) {
        entity.destroy();
      }
    });

    const cameraPos = cameraEntity.get(posComp)!;
    cameraPos
      .rotateY(delta / 700)
      .rotateX(delta / 800)
      .setPosition(vec3.transformQuat(
        vec3.create(),
        [0, 0, 40],
        cameraPos.getRotation(),
      ));

    store.sort();

    const instancedBuffer = new GLArrayBuffer(null, 'stream');

    const chunkData = new Float32Array(2048 * 3);

    store.forEachChunkWith([posComp, velComp], (chunk) => {
      // Create chunk data...
      // const posData = posComp.getChunkArray(chunk)!;
      let chunkPos = 0;
      chunk.forEach((entity) => {
        const pos = posComp.get(entity)!;
        chunkData.set(pos.getPosition(), chunkPos);
        chunkPos += 3;
      });
      instancedBuffer.set(chunkData);
      vao.bind(renderer);
      shader.bind(renderer);
      shader.setAttribute('aInstanced', {buffer: instancedBuffer, divisor: 1});
      shader.setUniforms({
        uProjection: cameraEntity.get(cameraComp)!.getProjection(800 / 600),
        uView: cameraEntity.get(cameraComp)!.getView(cameraEntity.get(posComp)!),
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
