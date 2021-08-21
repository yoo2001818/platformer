import {mat4, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {Renderer} from '../Renderer';
import {DIRECTIONAL_LIGHT} from '../shader/light';
import {ShadowMapHandle} from '../ShadowMapManager';

import {Light, LightShaderBlock} from './Light';

const NUM_CASCADES = 3;
const CASCADE_BREAKPOINTS = [0, 0.3, 0.7, 1];

export interface DirectionalShadowLightOptions {
  color: string | number[];
  power: number;
}

export class DirectionalShadowLight implements Light {
  type = 'directional';
  options: DirectionalShadowLightOptions;
  atlases: ShadowMapHandle[] = [];
  viewProjections: mat4[];
  breakpoints: number[] = [];

  constructor(options: DirectionalShadowLightOptions) {
    this.options = options;
    this.atlases = [];
    this.viewProjections =
      Array.from({length: NUM_CASCADES}, () => mat4.create());
    this.breakpoints = [];
  }

  getShaderBlock(numLights: number): LightShaderBlock {
    return {
      header: /* glsl */`
        #define NUM_DIRECTIONAL_SHADOW_LIGHTS ${numLights}
        #define NUM_DIRECTIONAL_SHADOW_CASCADES ${NUM_CASCADES}

        ${DIRECTIONAL_LIGHT}
        
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
          int j = NUM_DIRECTIONAL_SHADOW_CASCADES * i + cascadeId;
          DirectionalLight light = uDirectionalShadowLights[i];
          vec4 shadowUV = uDirectionalShadowUV[j];
          mat4 shadowMatrix = uDirectionalShadowMatrix[j];
          vec4 lightProj = shadowMatrix * vec4(mInfo.position, 1.0);
          vec3 lightPos = lightProj.xyz / lightProj.w;
          lightPos = lightPos * 0.5 + 0.5;
          vec2 lightUV = lightPos.xy;
          lightUV = shadowUV.xy + lightUV * shadowUV.zw;
          float lightValue = texture2D(uDirectionalShadowMap, lightUV).r;
          float lightInten = 0.0;
          if (lightValue + 0.0005 >= lightPos.z) {
            lightInten = 1.0;
          }
          result += lightInten * calcDirectional(viewPos, mInfo, light);
          // result += vec3(lightUV, float(cascadeId) / 3.0);
          // result = vec3(fract(lightPos.xy), lightValue / lightInten);
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
        const bounds = light.atlases[i].bounds;
        uvOutput.push([
          bounds[0] / shadowMapManager.width,
          bounds[1] / shadowMapManager.height,
          bounds[2] / shadowMapManager.width,
          bounds[3] / shadowMapManager.height,
        ]);
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
    const {shadowMapManager, camera, pipeline} = renderer;

    let debugCanvas: CanvasRenderingContext2D;
    if ((window as any).debugCanvas == null) {
      const elem = document.createElement('canvas');
      elem.width = 550;
      elem.height = 400;
      document.body.appendChild(elem);
      const ctx = elem.getContext('2d');
      (window as any).debugCanvas = ctx;
      debugCanvas = ctx!;
    } else {
      debugCanvas = (window as any).debugCanvas;
    }
    debugCanvas.clearRect(0, 0, 550, 400);

    const cameraData = camera!.get<Camera>('camera')!;
    const cameraProjection =
      cameraData.getProjection(1);
    const cameraInvProjection =
      cameraData.getInverseProjection(renderer.getAspectRatio());
    const cameraInvView = cameraData.getInverseView(camera!);

    // Draw camera
    {
      const vertices = [
        vec4.fromValues(-1, -1, -1, 1),
        vec4.fromValues(1, -1, -1, 1),
        vec4.fromValues(-1, 1, -1, 1),
        vec4.fromValues(1, 1, -1, 1),
        vec4.fromValues(-1, -1, 1, 1),
        vec4.fromValues(1, -1, 1, 1),
        vec4.fromValues(-1, 1, 1, 1),
        vec4.fromValues(1, 1, 1, 1),
      ].map((corner, index) => {
        const pos: Float32Array = vec4.create() as Float32Array;
        // NDC -> view
        vec4.transformMat4(pos, corner, cameraInvProjection);
        vec4.scale(pos, pos, 1 / pos[3]);
        // view -> world
        vec4.transformMat4(pos, pos, cameraInvView);
        return pos;
      });
      [
        [0, 1], [0, 2], [1, 3], [2, 3],
        [4, 5], [4, 6], [5, 7], [6, 7],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ].forEach(([a, b]) => {
        const aPos = vertices[a];
        const bPos = vertices[b];
        debugCanvas.strokeStyle = '#f00';
        debugCanvas.beginPath();
        debugCanvas.lineTo(aPos[0] + 550 / 2, aPos[2] + 400 / 2);
        debugCanvas.lineTo(bPos[0] + 550 / 2, bPos[2] + 400 / 2);
        debugCanvas.stroke();
      });
    }

    const cameraZ = cameraProjection[10];
    const cameraW = cameraProjection[14];
    const cameraNear = cameraW / (cameraZ - 1);
    const cameraFar = cameraW / (cameraZ + 1);

    // Note that this must be performed FOR EACH directional light
    entities.forEach((entity) => {
      const light = entity.get<DirectionalShadowLight>('light')!;
      const transform = entity.get<Transform>('transform')!;
      const lightModel = transform.getMatrix();
      const lightView = mat4.create();
      mat4.invert(lightView, lightModel);

      for (let i = 0; i < NUM_CASCADES; i += 1) {
        const atlas = shadowMapManager.get(light.atlases[i]);
        light.atlases[i] = atlas;

        const breakPrevRaw = CASCADE_BREAKPOINTS[i];
        const breakPrevZ = cameraNear + breakPrevRaw * (cameraFar - cameraNear);
        const breakPrev = (-breakPrevZ * cameraZ + cameraW) / breakPrevZ;

        const breakNextRaw = CASCADE_BREAKPOINTS[i + 1];
        const breakNextZ = cameraNear + breakNextRaw * (cameraFar - cameraNear);
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
        // Construct light projection matrix
        const lightProj = mat4.create();
        mat4.ortho(
          lightProj,
          minVec[0], maxVec[0],
          minVec[1], maxVec[1],
          -maxVec[2], -minVec[2],
        );
        mat4.mul(light.viewProjections[i], lightProj, lightView);
        const lightInv = mat4.create();
        mat4.invert(lightInv, light.viewProjections[i]);
        {
          const vertices = [
            vec4.fromValues(-1, -1, -1, 1),
            vec4.fromValues(1, -1, -1, 1),
            vec4.fromValues(-1, 1, -1, 1),
            vec4.fromValues(1, 1, -1, 1),
            vec4.fromValues(-1, -1, 1, 1),
            vec4.fromValues(1, -1, 1, 1),
            vec4.fromValues(-1, 1, 1, 1),
            vec4.fromValues(1, 1, 1, 1),
          ].map((corner, index) => {
            const pos: Float32Array = vec4.create() as Float32Array;
            vec4.transformMat4(pos, corner, lightInv);
            return pos;
          });
          [
            [0, 1], [0, 2], [1, 3], [2, 3],
            [4, 5], [4, 6], [5, 7], [6, 7],
            [0, 4], [1, 5], [2, 6], [3, 7],
          ].forEach(([a, b]) => {
            const aPos = vertices[a];
            const bPos = vertices[b];
            debugCanvas.strokeStyle = `rgb(0, 0, ${i * 70 + 50})`;
            debugCanvas.beginPath();
            debugCanvas.lineTo(aPos[0] + 550 / 2, aPos[2] + 400 / 2);
            debugCanvas.lineTo(bPos[0] + 550 / 2, bPos[2] + 400 / 2);
            debugCanvas.stroke();
          });
        }
        // Construct shadow map
        pipeline.renderShadow({
          frameBuffer: shadowMapManager.frameBuffer,
          state: {
            viewport: atlas.bounds,
          },
          uniforms: {
            uProjection: lightProj,
            uView: lightView,
          },
        });
      }
    });
  }
}
