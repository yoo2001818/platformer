// import {vec3} from 'gl-matrix';

import {EntityStore} from '../core/EntityStore';
import {Renderer} from '../render/Renderer';
import {Geometry} from '../render/Geometry';
import {StandardMaterial} from '../render/material/StandardMaterial';
import {GLRenderer} from '../render/gl/GLRenderer';
import {calcTangents} from '../geom/calcTangents';
import {quad} from '../geom/quad';
import {Transform} from '../3d/Transform';
import {Camera} from '../3d/Camera';
import {Mesh} from '../render/Mesh';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {createImage} from '../render/utils/createImage';
import {OrbitCameraController} from '../input/OrbitCameraController';
import {generateCubePackEquirectangular} from '../render/map/generateCubePack';
import {generatePBREnvMap} from '../render/map/generatePBREnvMap';
import {getHDRType} from '../render/hdr/utils';
import {SkyboxMaterial} from '../render/material/SkyboxMaterial';
import {EnvironmentLight} from '../render/light/EnvironmentLight';
import {DirectionalShadowLight} from '../render/light/DirectionalShadowLight';
import {calcNormals} from '../geom/calcNormals';
import {GLTextureImage} from '../render/gl/GLTextureImage';
import {parseGLTF} from '../loader/gltf';
import {updateAnimation} from '../anim/updateAnimation';
import {create3DComponents} from '../3d/create3DComponents';
import {WorldBVH} from '../render/raytrace/WorldBVH';
// import {box} from '../geom/box';
// import {BVH, BVHNode} from '../3d/BVH';

const store = new EntityStore();

store.registerComponents(create3DComponents());

function main() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {antialias: false}) || canvas.getContext('webgl');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  document.body.appendChild(canvas);

  if (gl == null) {
    alert('WebGL is not supported');
    return;
  }

  const glRenderer = new GLRenderer(gl);
  const renderer = new Renderer(glRenderer, store);
  glRenderer.setViewport();

  const skyboxTexture = new GLTexture2D({
    width: 4096,
    height: 2048,
    format: 'rgba',
    source: createImage(require('./studio_country_hall_2k.rgbe.png')),
    magFilter: 'nearest',
    minFilter: 'nearest',
    mipmap: false,
  });

  const cameraEntity = store.create({
    transform: new Transform().translate([0, 0, 40]),
    camera: new Camera({
      type: 'perspective',
      fov: 70 / 180 * Math.PI,
      far: 1000,
      near: 0.3,
    }),
  });

  const hdrType = getHDRType(glRenderer);
  const mip = generateCubePackEquirectangular(
    glRenderer,
    skyboxTexture,
    'rgbe',
    hdrType,
    1024,
  );
  const pbrTexture = generatePBREnvMap(glRenderer, mip, hdrType);

  const gltf = parseGLTF(require('./models/gitesthq.gltf'));
  store.createEntities(gltf.entities);

  /*
  const bvh = gltf.meshes[0].geometries[0].getBVH();
  function traverseBVH(bvh: BVH, node: BVHNode, depth = 0): void {
    if (depth === 5) {
      const center: vec3 = [
        (node.bounds[0] + node.bounds[3]) / 2,
        (node.bounds[1] + node.bounds[4]) / 2,
        (node.bounds[2] + node.bounds[5]) / 2,
      ];
      const size: vec3 = [
        node.bounds[3] - center[0],
        node.bounds[4] - center[1],
        node.bounds[5] - center[2],
      ];
      store.create({
        name: 'box',
        transform: new Transform()
          .setPosition(center)
          .setScale(size),
        mesh: new Mesh(
          new StandardMaterial({
            albedo: [Math.random(), Math.random(), Math.random()],
            metalic: 0,
            roughness: 0.4,
          }),
          new Geometry(calcNormals(box())),
          {castShadow: false},
        ),
      });
    }
    if (!node.isLeaf) {
      traverseBVH(bvh, node.left, depth + 1);
      traverseBVH(bvh, node.right, depth + 1);
    }
  }
  traverseBVH(bvh, bvh.root);
  */

  store.create({
    name: 'floor',
    transform: new Transform()
      .rotateX(-Math.PI / 2)
      .setScale([40, 40, 40])
      .translate([0, -1, 0]),
    mesh: new Mesh(
      new StandardMaterial({
        albedo: new GLTextureImage(require('./textures/forestground01.albedo.jpg')),
        metalic: 0,
        roughness: new GLTextureImage(require('./textures/forestground01.roughness.jpg')),
        normal: new GLTextureImage(require('./textures/forestground01.normal.jpg')),
        texScale: [20, 20],
      }),
      new Geometry(calcTangents(calcNormals(quad()))),
      {
        castShadow: false,
      },
    ),
  });

  store.create({
    name: 'skybox',
    transform: new Transform(),
    mesh: new Mesh(
      new SkyboxMaterial({
        texture: pbrTexture,
        lod: 2,
      }),
      new Geometry(quad()),
    ),
  });

  store.create({
    name: 'envLight',
    transform: new Transform(),
    light: new EnvironmentLight({texture: pbrTexture, power: 1}),
  });

  store.create({
    name: 'directionalLight',
    transform: new Transform()
      .rotateY(90 * Math.PI / 180)
      .rotateX(-40 * Math.PI / 180),
    light: new DirectionalShadowLight({
      color: '#ffffff',
      power: 10,
    }),
  });

  const orbitController = new OrbitCameraController(
    canvas,
    document.body,
    cameraEntity,
    3,
  );

  renderer.setCamera(cameraEntity);

  const worldBVH = new WorldBVH(store);
  worldBVH.update();

  console.log(worldBVH);

  console.log(worldBVH.intersectRay([-0.1, -0.1, -5], [0, 0, 1]));

  let lastTime = 0;

  function update(time: number) {
    const delta = time - lastTime;
    lastTime = time;

    store.sort();

    orbitController.update(delta);
    renderer.render();

    updateAnimation(store, delta / 1000);

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  console.log(store);
}

main();


