import {mat4, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {Mesh} from '../Mesh';
import {Renderer} from '../Renderer';
import {DIRECTIONAL_LIGHT} from '../shader/light';
import {AtlasItem} from '../Atlas';
import {convertFloatArray} from '../gl/uniform/utils';
import {ShadowPipeline} from '../shadow/ShadowPipeline';
import {PCFShadowPipeline} from '../shadow/PCFShadowPipeline';

import {Light, LightShaderBlock} from './Light';
import {DIRECTIONAL_LIGHT_VALUE} from './constant';
import {DIRECTIONAL_LIGHT_TEX, GIZMO_LINE_MODEL, GIZMO_LINE_SHADER, GIZMO_QUAD_MODEL, GIZMO_QUAD_SHADER} from './gizmo';

const NUM_CASCADES = 3;
const CASCADE_BREAKPOINTS = [-1, 0.2, 0.5, 1];

export interface DirectionalShadowLightOptions {
  color: string | number[];
  power: number;
}

export class DirectionalShadowLight
implements Light<DirectionalShadowLightOptions> {
  type = 'directionalShadow';
  canRaytrace = true;
  options: DirectionalShadowLightOptions;
  atlases: AtlasItem[] = [];
  viewProjections: mat4[];
  breakpoints: number[] = [];

  constructor(options?: DirectionalShadowLightOptions) {
    this.options = options ?? {
      color: '#ffffff',
      power: 1,
    };
    this.atlases = [];
    this.viewProjections =
      Array.from({length: NUM_CASCADES}, () => mat4.create());
    this.breakpoints = [];
  }

  _getShadowPipeline(renderer: Renderer): ShadowPipeline {
    return renderer.getResource(
      'shadowPipeline~pcf',
      () => new PCFShadowPipeline(renderer),
    );
  }

  getOptions(): DirectionalShadowLightOptions {
    return this.options;
  }

  setOptions(options: DirectionalShadowLightOptions): void {
    this.options = options;
  }

  getShaderBlock(numLights: number, renderer: Renderer): LightShaderBlock {
    const shadowPipeline = this._getShadowPipeline(renderer);
    const shadowShaderBlock = shadowPipeline.getUnpackShaderBlock();
    return {
      header: /* glsl */`
        #define NUM_DIRECTIONAL_SHADOW_LIGHTS ${numLights}
        #define NUM_DIRECTIONAL_SHADOW_CASCADES ${NUM_CASCADES}

        ${DIRECTIONAL_LIGHT}
        ${shadowShaderBlock.header}
        
        uniform DirectionalLight uDirectionalShadowLights[NUM_DIRECTIONAL_SHADOW_LIGHTS];
        uniform vec4 uDirectionalShadowUV[${numLights * NUM_CASCADES}];
        uniform mat4 uDirectionalShadowMatrix[${numLights * NUM_CASCADES}];
        uniform float uDirectionalShadowBreakpoints[${numLights * NUM_CASCADES}];
        uniform highp sampler2D uDirectionalShadowMap;
      `,
      body: /* glsl */`
        for (int i = 0; i < NUM_DIRECTIONAL_SHADOW_LIGHTS; i += 1) {
          int cascadeId = 3;
          for (int j = 0; j < NUM_DIRECTIONAL_SHADOW_CASCADES; j += 1) {
            if ((mInfo.depth * 2.0 - 1.0) <= uDirectionalShadowBreakpoints[i * NUM_DIRECTIONAL_SHADOW_CASCADES + j]) {
              cascadeId = j;
              break;
            }
          }
          DirectionalLight light = uDirectionalShadowLights[i];
          for (int j = 0; j < NUM_DIRECTIONAL_SHADOW_CASCADES; j += 1) {
            if (j != cascadeId) {
              continue;
            }
            vec4 shadowUV = uDirectionalShadowUV[i * NUM_DIRECTIONAL_SHADOW_CASCADES + j];
            mat4 shadowMatrix = uDirectionalShadowMatrix[i * NUM_DIRECTIONAL_SHADOW_CASCADES + j];
            vec4 lightProj = shadowMatrix * vec4(mInfo.position, 1.0);
            vec3 lightPos = lightProj.xyz / lightProj.w;
            float lightInten = 1.0;
            if (abs(lightPos.x) < 1.0 && abs(lightPos.y) < 1.0) {
              lightPos = lightPos * 0.5 + 0.5;
              vec2 lightUV = lightPos.xy;
              lightInten = ${shadowShaderBlock.body}(uDirectionalShadowMap, lightUV, shadowUV, lightPos.z);
            }
            vec3 L;
            vec3 V = normalize(viewPos - mInfo.position);
            vec3 N = mInfo.normal;
            result +=
              lightInten *
              calcDirectionalLight(L, V, N, mInfo.position, light) *
              calcBRDF(L, V, N, mInfo);
          }
        }
      `,
    };
  }

  getUniforms(entities: Entity[], renderer: Renderer): {[key: string]: unknown;} {
    const {shadowMapManager} = renderer;
    const output: unknown[] = [];
    const uvOutput: unknown[] = [];
    const matOutput: unknown[] = [];
    const breakpointOutput: unknown[] = [];
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<DirectionalShadowLight>('light')!;
      if (transform == null || light == null) {
        return;
      }
      const dir = vec3.create();
      vec3.set(dir, 0, 0, 1);
      vec3.transformQuat(dir, dir, transform.getRotation());
      output.push({
        color: light.options.color,
        direction: [
          dir[0],
          dir[1],
          dir[2],
          light.options.power / Math.PI,
        ],
      });
      for (let i = 0; i < NUM_CASCADES; i += 1) {
        const atlas = light.atlases[i];
        uvOutput.push(shadowMapManager.getUV(atlas));
        matOutput.push(light.viewProjections[i]);
        breakpointOutput.push(light.breakpoints[i]);
      }
    });
    return {
      uDirectionalShadowLights: output,
      uDirectionalShadowUV: uvOutput,
      uDirectionalShadowMatrix: matOutput,
      uDirectionalShadowBreakpoints: breakpointOutput,
      uDirectionalShadowMap: shadowMapManager.texture,
    };
  }

  prepare(entities: Entity[], renderer: Renderer): void {
    const {shadowMapManager, camera, pipeline, entityStore} = renderer;

    const shadowPipeline = this._getShadowPipeline(renderer);

    const cameraData = camera!.get<Camera>('camera')!;
    const {near, far} = cameraData.options;
    const cameraProjection =
      cameraData.getProjection(1);
    const cameraInvProjection =
      cameraData.getInverseProjection(renderer.getAspectRatio());
    const cameraInvView = cameraData.getInverseView(camera!);

    const cameraZ = cameraProjection[10];
    const cameraW = cameraProjection[14];

    // Note that this must be performed FOR EACH directional light
    entities.forEach((entity) => {
      const light = entity.get<DirectionalShadowLight>('light')!;
      const transform = entity.get<Transform>('transform')!;
      const lightModel = transform.getMatrixWorld();
      const lightView = mat4.create();
      mat4.invert(lightView, lightModel);

      // Retrieve boundary for all objects
      // Boundary in **light view** space
      const worldMin = vec3.create();
      const worldMax = vec3.create();
      let worldInitialized = false;
      entityStore.forEachWith(['transform', 'mesh'], (entity) => {
        const transform = entity.get<Transform>('transform')!;
        const mesh = entity.get<Mesh>('mesh')!;
        const transformMat = transform.getMatrixWorld();
        const out = vec3.create();
        if (!mesh.shouldCastShadow()) {
          return;
        }
        mesh.getBoundPoints().forEach((point) => {
          vec3.transformMat4(out, point as vec3, transformMat);
          vec3.transformMat4(out, out, lightView);
          if (!worldInitialized) {
            vec3.copy(worldMin, out);
            vec3.copy(worldMax, out);
            worldInitialized = true;
          } else {
            vec3.min(worldMin, worldMin, out);
            vec3.max(worldMax, worldMax, out);
          }
        });
      });
      // Give a small amount of margin
      vec3.add(worldMin, worldMin, [-0.01, -0.01, -0.01]);
      vec3.add(worldMax, worldMax, [0.01, 0.01, 0.01]);

      for (let i = 0; i < NUM_CASCADES; i += 1) {
        const atlas = shadowMapManager.getAtlas(light.atlases[i], 1024, 1024);
        light.atlases[i] = atlas;

        const breakPrevRaw = CASCADE_BREAKPOINTS[i];
        const breakPrevZ = near + breakPrevRaw * (far - near);
        const breakPrev = (-breakPrevZ * cameraZ + cameraW) / breakPrevZ;

        const breakNextRaw = CASCADE_BREAKPOINTS[i + 1];
        const breakNextZ = near + breakNextRaw * (far - near);
        const breakNext = (-breakNextZ * cameraZ + cameraW) / breakNextZ;

        light.breakpoints[i] = breakNext;

        // Calculate view/projection matrix for the shadow
        // This is (not...) simply done by converting each vertex of display
        // frustum into light's local space, and calculating AABB boundary
        // of the frustum in the light's local space.
        const minVec = vec3.create();
        const maxVec = vec3.create();
        const corners = [
          vec4.fromValues(-1, -1, breakPrev, 1),
          vec4.fromValues(1, -1, breakPrev, 1),
          vec4.fromValues(-1, 1, breakPrev, 1),
          vec4.fromValues(1, 1, breakPrev, 1),
          vec4.fromValues(-1, -1, breakNext, 1),
          vec4.fromValues(1, -1, breakNext, 1),
          vec4.fromValues(-1, 1, breakNext, 1),
          vec4.fromValues(1, 1, breakNext, 1),
        ];
        corners.forEach((corner, index) => {
          const pos: Float32Array = vec4.create() as Float32Array;
          // NDC -> view
          vec4.transformMat4(pos, corner, cameraInvProjection);
          vec4.scale(pos, pos, 1 / pos[3]);
          // view -> world
          vec4.transformMat4(pos, pos, cameraInvView);
          // world -> light
          vec4.transformMat4(pos, pos, lightView);
          // Apply to minVec / maxVec
          if (index === 0) {
            vec3.copy(minVec, pos);
            vec3.copy(maxVec, pos);
          } else {
            vec3.min(minVec, minVec, pos);
            vec3.max(maxVec, maxVec, pos);
          }
        });
        // Intersect with world boundary
        vec3.max(minVec, minVec, worldMin);
        vec3.min(maxVec, maxVec, worldMax);
        const isValid =
          minVec[0] < maxVec[0] &&
          minVec[1] < maxVec[1] &&
          minVec[2] < maxVec[2];
        // Construct light projection matrix
        const lightProj = mat4.create();
        mat4.ortho(
          lightProj,
          minVec[0], maxVec[0],
          minVec[1], maxVec[1],
          -maxVec[2], -minVec[2],
        );
        mat4.mul(light.viewProjections[i], lightProj, lightView);
        if (isValid) {
          // Construct shadow map
          shadowPipeline.begin(atlas, {
            uProjection: lightProj,
            uView: lightView,
          });
          pipeline.renderVertex(
            (id, onCreate) => shadowPipeline.getShader(id, onCreate),
            (options) => shadowPipeline.draw(options),
          );
          shadowPipeline.finalize();
        }
      }
    });
  }

  writeTexture(entity: Entity, buffer: Float32Array, position: number): void {
    // This will be used by ray tracing routine, so no shadow data are needed
    // dir, type (1), color, power
    const {options} = this;
    const transform = entity.get<Transform>('transform')!;
    if (transform == null) {
      return;
    }
    const dir = vec3.create();
    vec3.set(dir, 0, 0, 1);
    vec3.transformQuat(dir, dir, transform.getRotation());
    buffer[position + 0] = dir[0];
    buffer[position + 1] = dir[1];
    buffer[position + 2] = dir[2];
    buffer[position + 3] = DIRECTIONAL_LIGHT_VALUE;
    const colorVec = convertFloatArray(options.color, 3);
    buffer[position + 4] = colorVec[0];
    buffer[position + 5] = colorVec[1];
    buffer[position + 6] = colorVec[2];
    buffer[position + 7] = options.power;
  }

  renderGizmo(entities: Entity[], renderer: Renderer, color: string): void {
    const {glRenderer, pipeline} = renderer!;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    entities.forEach((entity) => {
      const camUniforms = pipeline.getCameraUniforms();

      const transform = entity.get<Transform>('transform');
      const light = entity.get<Light>('light');
      if (transform == null || light == null) {
        return;
      }
      if (!(light instanceof DirectionalShadowLight)) {
        return;
      }
      glRenderer.draw({
        geometry: GIZMO_QUAD_MODEL,
        shader: GIZMO_QUAD_SHADER,
        uniforms: {
          ...camUniforms,
          uModel: transform.getMatrixWorld(),
          uTexture: DIRECTIONAL_LIGHT_TEX,
          uScale: [48 / width, 48 / height],
          uColor: color,
        },
        state: {
          depth: false,
          blend: {
            equation: 'add',
            func: [
              ['srcAlpha', 'oneMinusSrcAlpha'],
              ['one', 'one'],
            ],
          },
        },
      });
      glRenderer.draw({
        geometry: GIZMO_LINE_MODEL,
        shader: GIZMO_LINE_SHADER,
        uniforms: {
          ...camUniforms,
          uModel: transform.getMatrixWorld(),
          uColor: color,
          uScale: 10,
        },
        state: {
          depth: false,
        },
      });
    });
  }

  toJSON(): unknown {
    return this.options;
  }

  clone(): DirectionalShadowLight {
    return new DirectionalShadowLight(this.options);
  }
}
