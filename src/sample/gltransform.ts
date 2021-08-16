import {EntityStore} from '../core/EntityStore';
import {Float32ArrayComponent, ObjectComponent} from '../core/components';
import {calcNormals} from '../geom/calcNormals';
import {box} from '../geom/box';
// import {bakeChannelGeom} from '../geom/channelGeom/bakeChannelGeom';
// import {parseObj} from '../geom/loader/obj';
import {Renderer} from '../render/Renderer';
import {Geometry} from '../render/Geometry';
import {StandardMaterial} from '../render/material/BasicMaterial';
import {GLRenderer} from '../render/gl/GLRenderer';
import {TransformComponent} from '../3d/TransformComponent';
import {Transform} from '../3d/Transform';
import {Camera} from '../3d/Camera';
import {MeshComponent} from '../render/MeshComponent';
import {Mesh} from '../render/Mesh';
import {Light} from '../render/light/Light';
import {PointLight} from '../render/light/PointLight';
import {createImage} from '../render/utils/createImage';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {OrbitCameraController} from '../input/OrbitCameraController';

import logo from './logo.png';

const store = new EntityStore();

const posComp = new TransformComponent();
const velComp = new Float32ArrayComponent(4);
const cameraComp = new ObjectComponent<Camera>();
const lightComp = new ObjectComponent<Light>();
const meshComp = new MeshComponent();

store.registerComponents({
  transform: posComp,
  vel: velComp,
  camera: cameraComp,
  mesh: meshComp,
  light: lightComp,
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

  const texture = new GLTexture2D({source: createImage(logo)});
  const geometry = new Geometry(calcNormals(box()));
  const material = new StandardMaterial({
    albedo: texture,
    metalic: 0,
    roughness: 0.02,
  });

  gl!.enable(gl!.CULL_FACE);
  gl!.enable(gl!.DEPTH_TEST);
  gl!.depthFunc(gl!.LEQUAL);

  const lightEntity = store.create({
    transform: new Transform().translate([20, 0, 0]),
    light: new PointLight({
      color: '#ffffff',
      power: 1,
      radius: 0.0001,
      range: 1,
    }),
  });
  const lightBox = store.create({
    transform: new Transform(),
    mesh: new Mesh(material, geometry),
  });

  const cameraEntity = store.create({
    transform: new Transform().translate([0, 0, 40]),
    camera: new Camera({
      type: 'perspective',
      fov: 70 / 180 * Math.PI,
      far: 1000,
      near: 0.1,
    }),
  });

  const orbitController = new OrbitCameraController(
    canvas,
    document.body,
    cameraEntity,
    30,
  );

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

    lightEntity.get(posComp)!.setPosition([
      Math.cos(time / 1000) * 30,
      Math.sin(time / 1000) * 30,
      0,
    ]);

    lightBox.get(posComp)!.setPosition([
      Math.cos(time / 1000) * 30,
      Math.sin(time / 1000) * 30,
      0,
    ]);

    store.sort();

    gl!.clearColor(0, 0, 0, 255);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    renderer.render();
    orbitController.update(delta);

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  update(0);
  console.log(store);
}

main();
