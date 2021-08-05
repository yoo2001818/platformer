import {vec3} from 'gl-matrix';

import {EntityStore} from '../core/EntityStore';
import {Float32ArrayComponent, ObjectComponent} from '../core/components';
import {calcNormals} from '../geom/calcNormals';
import {box} from '../geom/box';
// import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
// import {parseObj} from '../geom/loader/obj';
import {Renderer} from '../render/Renderer';
import {Geometry} from '../render/Geometry';
import {BasicMaterial} from '../render/BasicMaterial';
import {GLRenderer} from '../render/gl/GLRenderer';
import {TransformComponent} from '../3d/TransformComponent';
import {Transform} from '../3d/Transform';
import {Camera} from '../3d/Camera';
import {MeshComponent} from '../render/MeshComponent';
import {Mesh} from '../render/Mesh';

const store = new EntityStore();

const posComp = new TransformComponent();
const velComp = new Float32ArrayComponent(4);
const cameraComp = new ObjectComponent<Camera>();
const meshComp = new MeshComponent();

store.registerComponents({
  transform: posComp,
  vel: velComp,
  camera: cameraComp,
  mesh: meshComp,
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

  const glRenderer = new GLRenderer(gl);
  const renderer = new Renderer(glRenderer, store);

  const geometry = new Geometry(calcNormals(box()));
  const material = new BasicMaterial();

  gl!.enable(gl!.CULL_FACE);
  gl!.enable(gl!.DEPTH_TEST);
  gl!.depthFunc(gl!.LEQUAL);

  const cameraEntity = store.create({
    transform: new Transform().translate([0, 0, 40]),
    camera: new Camera({
      type: 'perspective',
      fov: 70 / 180 * Math.PI,
      far: 1000,
      near: 0.1,
    }),
  });

  renderer.setCamera(cameraEntity);

  let lastTime = 0;

  function update(time: number) {
    const delta = time - lastTime;
    lastTime = time;
    for (let i = 0; i < 1; i += 1) {
      const entity = store.create();
      entity.set('transform', new Transform());
      entity.set('vel', new Float32Array([
        (Math.random() * 2 - 1) * 20,
        (Math.random() * 2 - 1) * 20,
        (Math.random() * 2 - 1) * 20,
        1,
      ]));
      entity.set('mesh', new Mesh(material, geometry));
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
      // .rotateX(delta / 800)
      .setPosition(vec3.transformQuat(
        vec3.create(),
        [0, 0, 40],
        cameraPos.getRotation(),
      ));

    store.sort();

    /*
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
    */
    gl!.clearColor(0, 0, 0, 255);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    renderer.render();

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  update(0);
  console.log(store);
}

main();
