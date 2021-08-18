import {mat4, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {Renderer} from '../Renderer';
import {DIRECTIONAL_LIGHT} from '../shader/light';
import {ShadowMapHandle} from '../ShadowMapManager';

import {Light, LightShaderBlock} from './Light';

export interface DirectionalShadowLightOptions {
  color: string | number[];
  power: number;
}

export class DirectionalShadowLight implements Light {
  type = 'directional';
  options: DirectionalShadowLightOptions;
  atlas: ShadowMapHandle | null;
  viewProjection: mat4;

  constructor(options: DirectionalShadowLightOptions) {
    this.options = options;
    this.atlas = null;
    this.viewProjection = mat4.create();
  }

  getShaderBlock(numLights: number): LightShaderBlock {
    return {
      header: /* glsl */`
        #define NUM_DIRECTIONAL_SHADOW_LIGHTS ${numLights}

        ${DIRECTIONAL_LIGHT}
        
        uniform DirectionalLight uDirectionalShadowLights[NUM_DIRECTIONAL_SHADOW_LIGHTS];
        uniform vec4 uDirectionalShadowUV[NUM_DIRECTIONAL_SHADOW_LIGHTS];
        uniform mat4 uDirectionalShadowMatrix[NUM_DIRECTIONAL_SHADOW_LIGHTS];
        uniform sampler2D uDriectionalShadowMap;
      `,
      body: /* glsl */`
        for (int i = 0; i < NUM_DIRECTIONAL_SHADOW_LIGHTS; i += 1) {
          DirectionalLight light = uDirectionalShadowLights[i];
          vec4 shadowUV = uDirectionalShadowUV[i];
          mat4 shadowMatrix = uDirectionalShadowMatrix[i];
          vec4 lightProj = shadowMatrix * vec4(mInfo.position, 1.0);
          vec3 lightPos = lightProj.xyz / lightProj.w;
          lightPos = lightPos * 0.5 + 0.5;
          vec2 lightUV = lightPos.xy;
          // lightUV = shadowUV.xy + lightUV * shadowUV.zw;
          float lightValue = texture2D(uDriectionalShadowMap, lightUV).r;
          float lightInten = 0.0;
          if (lightValue + 0.0005 >= lightPos.z) {
            lightInten = 1.0;
          }
          result += lightInten * calcDirectional(viewPos, mInfo, light);
        }
      `,
    };
  }

  getUniforms(entities: Entity[], renderer: Renderer): {[key: string]: unknown;} {
    const {shadowMapManager} = renderer;
    const output: unknown[] = [];
    const uvOutput: unknown[] = [];
    const matOutput: unknown[] = [];
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
      const bounds = light.atlas!.bounds;
      uvOutput.push([
        bounds[0] / shadowMapManager.width,
        bounds[1] / shadowMapManager.height,
        bounds[2] / shadowMapManager.width,
        bounds[3] / shadowMapManager.height,
      ]);
      matOutput.push(light.viewProjection);
    });
    return {
      uDirectionalShadowLights: output,
      uDirectionalShadowUV: uvOutput,
      uDirectionalShadowMatrix: matOutput,
      uDirectionalShadowMap: shadowMapManager.texture,
    };
  }

  prepare(entities: Entity[], renderer: Renderer): void {
    const {shadowMapManager, camera, pipeline} = renderer;
    const cameraData = camera!.get<Camera>('camera')!;
    const cameraInvProjection =
      cameraData.getInverseProjection(renderer.getAspectRatio());
    const cameraInvView = cameraData.getInverseView(camera!);

    // Note that this must be performed FOR EACH directional light
    entities.forEach((entity) => {
      const light = entity.get<DirectionalShadowLight>('light')!;
      const transform = entity.get<Transform>('transform')!;
      const lightModel = transform.getMatrix();
      const lightView = mat4.create();
      mat4.invert(lightView, lightModel);

      light.atlas = shadowMapManager.get(light.atlas);

      // Calculate view/projection matrix for the shadow
      // This is (not...) simply done by converting each vertex of display
      // frustum into light's local space, and calculating AABB boundary
      // of the frustum in the light's local space.
      const minVec = vec3.create();
      const maxVec = vec3.create();
      const corners = [
        vec4.fromValues(-1, -1, -1, 1),
        vec4.fromValues(1, -1, -1, 1),
        vec4.fromValues(-1, 1, -1, 1),
        vec4.fromValues(1, 1, -1, 1),
        vec4.fromValues(-1, -1, 1, 1),
        vec4.fromValues(1, -1, 1, 1),
        vec4.fromValues(-1, 1, 1, 1),
        vec4.fromValues(1, 1, 1, 1),
      ];
      corners.forEach((corner, index) => {
        const pos: Float32Array = vec4.create() as Float32Array;
        // NDC -> view
        vec4.transformMat4(pos, corner, cameraInvProjection);
        vec4.scale(pos, pos, 1 / pos[3]);
        // view -> world
        vec4.transformMat4(pos, pos, cameraInvView);
        // world -> light
        vec4.transformMat4(pos, pos, lightModel);
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
        minVec[2], maxVec[2],
      );
      mat4.mul(light.viewProjection, lightProj, lightView);
      // Construct shadow map
      pipeline.renderShadow({
        frameBuffer: shadowMapManager.frameBuffer,
        state: {
          viewport: light.atlas.bounds,
        },
        uniforms: {
          uProjection: lightProj,
          uView: lightView,
        },
      });
    });
  }
}
