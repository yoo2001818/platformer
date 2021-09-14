import {vec3, vec4} from 'gl-matrix';

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
import {box} from '../geom/box';
import {RaytracedPipeline} from '../render/pipeline/RaytracedPipeline';
import {TransformComponent} from '../3d/TransformComponent';
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
    transform: new Transform()
      .rotateY(Math.PI / 2)
      .translate([0, 0, 40]),
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

  const gltf = parseGLTF(require('./models/gitestlq.gltf'));
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

  /*
  store.create({
    name: 'arrow',
    transform: new Transform()
      .setPosition([0, 0, 0])
      .setScale([0.1, 0.1, 0.1]),
    mesh: new Mesh(
      new StandardMaterial({
        albedo: '#ffffff',
        metalic: 0,
        roughness: 0.4,
      }),
      new Geometry(calcNormals(box())),
      {castShadow: false},
    ),
  });
  */

  store.create({
    name: 'skybox',
    transform: new Transform(),
    mesh: new Mesh(
      new SkyboxMaterial({
        texture: pbrTexture,
        lod: 2,
      }),
      new Geometry(quad()),
      {castRay: false},
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

  const rasterPipeline = renderer.pipeline;
  const rayPipeline = new RaytracedPipeline(renderer, worldBVH);

  const testMesh = new Mesh(
    new StandardMaterial({
      albedo: '#ffffff',
      metalic: 0,
      roughness: 0.4,
    }),
    new Geometry(calcNormals(box())),
    {castShadow: false},
  );

  // Perform ray tracing for each vertex.
  /*
  let counter = 0;
  const start = performance.now();
  store.forEachWith(['mesh', 'transform'], (entity) => {
    const mesh = entity.get<Mesh>('mesh')!;
    const transform = entity.get<Transform>('transform')!;
    const mat = transform.getMatrixWorld();
    const pos = vec3.create();
    const normal = vec4.create() as vec3;
    const up = vec3.fromValues(0, 1, 0);
    const right = vec3.create();
    const sample = vec3.create();
    const sampleDir = vec3.create();
    const irradiance = vec3.create();
    mesh.geometries.forEach((geometry) => {
      const aPosition = geometry.options.attributes.aPosition;
      const aNormal = geometry.options.attributes.aNormal;
      const indices = geometry.options.indices;
      if (aPosition == null || aNormal == null || indices == null) {
        return;
      }
      const positions = flattenBuffer(aPosition.data) as Float32Array;
      const normals = flattenBuffer(aNormal.data) as Float32Array;
      const colors = new Float32Array(positions.length);
      for (let i = 0; i < positions.length; i += 3) {
        vec3.transformMat4(pos, positions.subarray(i, i + 3), mat);
        vec3.copy(normal, normals.subarray(i, i + 3));
        normal[3] = 0;
        vec4.transformMat4(normal as vec4, normal as vec4, mat);
        vec3.normalize(normal, normal);
        vec3.scaleAndAdd(pos, pos, normal, 0.01);
        vec3.set(up, 0, 1, 0);
        vec3.cross(right, up, normal);
        if (vec3.sqrLen(right) <= 0.001) {
          vec3.set(up, 0, 0, 1);
          vec3.cross(right, up, normal);
        }
        vec3.normalize(right, right);
        vec3.cross(up, normal, right);
        vec3.normalize(up, up);
        vec3.zero(irradiance);
        let samples = 0;
        for (let phiI = 0; phiI < 8; phiI += 1) {
          const phi = phiI / 8 * 2 * Math.PI;
          for (let thetaI = 0; thetaI < 4; thetaI += 1) {
            const theta = thetaI / 4 * 0.5 * Math.PI;
            sample[0] = Math.sin(theta) * Math.cos(phi);
            sample[1] = Math.sin(theta) * Math.sin(phi);
            sample[2] = Math.cos(theta);
            vec3.scale(sampleDir, right, sample[0]);
            vec3.scaleAndAdd(sampleDir, sampleDir, up, sample[1]);
            vec3.scaleAndAdd(sampleDir, sampleDir, normal, sample[2]);
            vec3.normalize(sampleDir, sampleDir);
            // Trace ray...
            const result = worldBVH.intersectRay(pos, sampleDir);
            if (result != null) {
              const dotNH = Math.cos(theta) * Math.sin(theta);
              const {mesh, geometryId} = result;
              const material = mesh.materials[geometryId];
              if (material instanceof StandardMaterial) {
                let color;
                if (material.options.albedo instanceof GLTexture) {
                  color = [1, 1, 1];
                } else {
                  color = convertFloatArray(material.options.albedo, 3);
                }
                vec3.scaleAndAdd(irradiance, irradiance, color as vec3, dotNH);
              }
              samples += 1;
            }
            counter += 1;
          }
        }
        colors[i] = irradiance[0] * Math.PI / samples;
        colors[i + 1] = irradiance[1] * Math.PI / samples;
        colors[i + 2] = irradiance[2] * Math.PI / samples;
      }
      geometry.options.attributes.aColor = {data: colors, size: 3};
    });
  });
  const end = performance.now();
  console.log('Ray tracing took', `${end - start}ms`, counter, worldBVH.counter);
  */

  let lastTime = 0;
  let lastMoveVersion = -1;
  let lastMoveFrame = 0;

  function update(time: number) {
    const delta = time - lastTime;
    lastTime = time;

    store.sort();

    orbitController.update(delta);

    lastMoveFrame += 1;
    const transformComp = store.getComponent<TransformComponent>('transform')!;
    if (lastMoveVersion !== transformComp.globalVersion) {
      lastMoveVersion = transformComp.globalVersion;
      lastMoveFrame = 0;
    }
    if (lastMoveFrame >= 60) {
      renderer.setPipeline(rayPipeline);
    } else {
      renderer.setPipeline(rasterPipeline);
    }

    renderer.render(delta / 1000);

    updateAnimation(store, delta / 1000);

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  console.log(store);

  window.addEventListener('click', (e) => {
    const cameraEntity = renderer.camera;
    const camera = cameraEntity!.get<Camera>('camera')!;
    const transform = cameraEntity!.get<Transform>('transform')!;
    const invProjection = camera.getInverseProjection(canvas.width / canvas.height);
    const invView = camera.getInverseView(cameraEntity!);

    const cameraPos = transform.getPositionWorld();
    // Calculate NDC... I think
    const viewPos = vec4.fromValues(
      e.clientX / canvas.width * 2 - 1,
      (canvas.height - e.clientY) / canvas.height * 2 - 1,
      1,
      1,
    );
    // Then convert to view pos
    vec4.transformMat4(viewPos, viewPos, invProjection);
    vec4.scale(viewPos, viewPos, 1 / viewPos[3]);
    // Then convert to world pos
    vec4.transformMat4(viewPos, viewPos, invView);
    const cameraDir = vec3.create();
    // Then create ray vector...
    vec3.sub(cameraDir, viewPos as vec3, cameraPos);
    vec3.normalize(cameraDir, cameraDir);

    // Then cast ray
    console.log(cameraPos, cameraDir);
    const result = worldBVH.intersectRay(cameraPos, cameraDir);
    console.log(result);
    console.log(result?.position);
    if (result != null) {
      store.create({
        name: 'arrow',
        transform: new Transform()
          .setPosition(result.position)
          .setScale([0.1, 0.1, 0.1]),
        mesh: testMesh,
      });
    }

    /*
    worldBVH.metNodes.forEach((node) => {
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
    });
    worldBVH.metNodes = [];
    */
  });
}

main();


