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

  constructor(options: DirectionalShadowLightOptions) {
    this.options = options;
    this.atlas = null;
  }

  getShaderBlock(numLights: number): LightShaderBlock {
    return {
      header: /* glsl */`
        #define NUM_POINT_LIGHTS ${numLights}

        ${DIRECTIONAL_LIGHT}
        
        uniform DirectionalLight uDirectionalLights[NUM_POINT_LIGHTS];
      `,
      body: /* glsl */`
        for (int i = 0; i < NUM_POINT_LIGHTS; i += 1) {
          DirectionalLight light = uDirectionalLights[i];

          result += calcDirectional(viewPos, mInfo, light);
        }
      `,
    };
  }

  getUniforms(entities: Entity[]): {[key: string]: unknown;} {
    const output: unknown[] = [];
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
    });
    return {uDirectionalLights: output};
  }

  prepare(entities: Entity[], renderer: Renderer): void {
    const {shadowMapManager, camera, pipeline} = renderer;
    const cameraData = camera!.get<Camera>('camera')!;
    const cameraInvProjection = cameraData.getInverseProjection(1);
    const cameraInvView = cameraData.getInverseView(camera!);

    // Note that this must be performed FOR EACH directional light
    entities.forEach((entity) => {
      const light = entity.get<DirectionalShadowLight>('light')!;
      const transform = entity.get<Transform>('transform')!;
      const lightView = transform.getMatrix();

      light.atlas = shadowMapManager.get(light.atlas);

      // Calculate view/projection matrix for the shadow
      // This is (not...) simply done by converting each vertex of display
      // frustum into light's local space, and calculating AABB boundary
      // of the frustum in the light's local space.
      const minVec = vec3.create();
      const maxVec = vec3.create();
      const corners = [
        vec4.fromValues(-1, -1, 0, 1),
        vec4.fromValues(1, -1, 0, 1),
        vec4.fromValues(-1, 1, 0, 1),
        vec4.fromValues(1, 1, 0, 1),
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
        minVec[0], maxVec[1],
        minVec[1], maxVec[1],
        minVec[2], maxVec[2],
      );
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
