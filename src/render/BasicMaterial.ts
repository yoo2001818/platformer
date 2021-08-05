import {Camera} from '../3d/Camera';
import {Transform} from '../3d/Transform';
import {TransformComponent} from '../3d/TransformComponent';
import {EntityChunk} from '../core/EntityChunk';

import {GLGeometry} from './gl/GLGeometry';
import {GLShader} from './gl/GLShader';
import {Material} from './Material';
import {Renderer} from './Renderer';
import {createId} from './utils/createId';

export class BasicMaterial implements Material {
  id: number;
  shader: GLShader;
  constructor() {
    this.id = createId();
    this.shader = new GLShader(`
      #version 100
      precision highp float;

      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aTexCoord;
      attribute vec3 aInstanced;

      uniform mat4 uView;
      uniform mat4 uProjection;
      uniform mat4 uModel;

      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vTexCoord;

      void main() {
        vec4 pos = uView * uModel * vec4(aPosition + aInstanced, 1.0);
        gl_Position = uProjection * pos;
        vPosition = pos.xyz;
        // TODO Normal 3x3 matrix
        vNormal = (uView * uModel * vec4(aNormal, 0.0)).xyz;
        vTexCoord = aTexCoord;
      } 
    `, `
      #version 100
      precision highp float;

      #define NUM_POINT_LIGHTS 1
      #define GAMMA 2.2

      struct Material {
        vec3 ambient;
        vec3 diffuse;
        vec3 specular;

        float shininess;
      };

      struct PointLight {
        vec3 position;
        vec3 color;
        vec4 intensity;
      };

      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vTexCoord;

      uniform mat4 uView;
      uniform PointLight uPointLights[NUM_POINT_LIGHTS];
      uniform Material uMaterial;

      vec3 normal;
      vec3 fragPos;
      vec3 ambient;
      vec3 diffuse;
      vec3 specular;

      vec3 calcPhong(vec3 lightDir, vec3 viewDir) {
        // Diffuse
        float lambertian = max(dot(lightDir, normal), 0.0);

        // Specular
        float spec = 0.0;
        float fresnel = 0.0;
        if (lambertian > 0.0) {
          vec3 halfDir = normalize(lightDir + viewDir);
          float specAngle = max(dot(halfDir, normal), 0.0);

          spec = pow(specAngle, uMaterial.shininess);
          fresnel = pow(1.0 - max(0.0, dot(halfDir, viewDir)), 5.0);
        }

        return vec3(lambertian, spec, fresnel);
      }

      vec3 calcPoint(PointLight light, vec3 viewDir) {
        vec3 lightPos = (uView * vec4(light.position, 1.0)).xyz;
        vec3 lightDir = lightPos - fragPos;

        float distance = length(lightDir);
        lightDir = lightDir / distance;

        // Attenuation
        float attenuation = 1.0 / ( 1.0 +
          light.intensity.w * (distance * distance));

        vec3 phong = calcPhong(lightDir, viewDir);

        // Combine everything together
        vec3 result = diffuse * light.intensity.g * phong.x;
        result += specular * light.intensity.b * phong.y;
        result += ambient * light.intensity.r;
        result *= attenuation;
        result *= light.color;

        return result;
      }

      void main() {
        fragPos = vPosition;
        vec3 viewDir = normalize(-vPosition);
        normal = normalize(vNormal);

        ambient = pow(uMaterial.ambient, vec3(GAMMA));
        diffuse = pow(uMaterial.diffuse, vec3(GAMMA));
        specular = pow(uMaterial.specular, vec3(GAMMA));

        vec3 result = vec3(0.0, 0.0, 0.0);

        for (int i = 0; i < NUM_POINT_LIGHTS; i += 1) {
          result += calcPoint(uPointLights[i], viewDir);
        }

        gl_FragColor = vec4(pow(result, vec3(1.0 / GAMMA)), 1.0);
      } 
    `);
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    // Bind the shaders
    const {glRenderer, entityStore, camera} = renderer;
    this.shader.bind(glRenderer);
    geometry.bind(glRenderer, this.shader);

    // Get the necessary components
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const cameraData = camera!.get<Camera>('camera')!;
    const cameraTransform = camera!.get<Transform>(transformComp)!;
    this.shader.setUniforms({
      uView: cameraData.getView(cameraTransform),
      uProjection: cameraData.getProjection(renderer.getAspectRatio()),
      uPointLights: [{
        position: [0, 0, 0],
        color: '#ffffff',
        intensity: [0.1, 1, 1, 0.001],
      }],
      uMaterial: {
        ambient: '#ff0000',
        diffuse: '#00ff00',
        specular: '#0000ff',
        shininess: 1,
      },
    });
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      // Set uniforms and draw the element
      this.shader.setUniforms({
        uModel: transform.getMatrix(),
      });
      geometry.draw();
    });
  }

  dispose(): void {
    this.shader.dispose();
  }
}
