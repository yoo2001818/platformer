import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture} from '../gl/GLTexture';
import {GLTexture2D} from '../gl/GLTexture2D';
import {GLTextureGenerated} from '../gl/GLTextureGenerated';
import {PBR} from '../shader/pbr';

import {generateHammersleyMap} from './generateHammersleyMap';

const BRDF_QUAD = new GLGeometry(quad());
const BRDF_SHADER = new GLShader(
  /* glsl */`
    #version 100
    precision highp float;

    attribute vec3 aPosition;

    varying vec2 vPosition;

    void main() {
      vPosition = aPosition.xy * 0.5 + 0.5;
      gl_Position = vec4(aPosition.xy, 1.0, 1.0);
    }
  `,
  /* glsl */`
    #version 100
    precision highp float;

    varying vec2 vPosition;

    uniform sampler2D uHammersleyMap;

    ${PBR}

    vec2 integrateBRDF(float NdotV, float roughness) {
      vec3 V;
      V.x = sqrt(1.0 - NdotV * NdotV);
      V.y = 0.0;
      V.z = NdotV;
  
      float A = 0.0;
      float B = 0.0;
  
      vec3 N = vec3(0.0, 0.0, 1.0);
  
      const int SAMPLE_COUNT = 1024;
      for (int i = 0; i < SAMPLE_COUNT; ++i) {
        vec2 Xi = hammersleyFromMap(uHammersleyMap, i, SAMPLE_COUNT);
        vec3 H  = importanceSampleGGX(Xi, N, roughness);
        vec3 L  = normalize(2.0 * dot(V, H) * H - V);

        float NdotL = max(L.z, 0.0);
        float NdotH = max(H.z, 0.0);
        float VdotH = max(dot(V, H), 0.0);

        if (NdotL > 0.0) {
          float lambda = lambdaGGX(roughness);
          float G = geometrySmith(roughness, NdotV, NdotL);
          float G_Vis = (G * VdotH) / (NdotH * NdotV);
          float Fc = pow(1.0 - VdotH, 5.0);

          A += (1.0 - Fc) * G_Vis;
          B += Fc * G_Vis;
        }
      }
      A /= float(SAMPLE_COUNT);
      B /= float(SAMPLE_COUNT);
      return vec2(A, B);
    }

    void main() {
      gl_FragColor = vec4(
        integrateBRDF(vPosition.x, vPosition.y * vPosition.y),
        0.0,
        1.0
      );
    }
  `,
);

export function generateBRDFMap(): GLTexture {
  return new GLTextureGenerated({
    width: 512,
    height: 512,
    wrapS: 'clampToEdge',
    wrapT: 'clampToEdge',
    minFilter: 'linear',
    magFilter: 'linear',
    mipmap: false,
    format: 'rgba',
  }, (renderer) => {
    const hammersleyMap = generateHammersleyMap(1024);
    const {capabilities} = renderer;

    const texture = new GLTexture2D({
      width: 512,
      height: 512,
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      minFilter: 'linear',
      magFilter: 'linear',
      mipmap: false,
      source: null,
      format: 'rgba',
      // Use half float only if supported. Otherwise fallback to unsigned byte.
      // It may show artifacts in round objects, but it'd be fine...
      type:
        capabilities.hasHalfFloatBuffer() &&
        capabilities.hasHalfFloatTextureLinear()
        ? 'halfFloat'
        : 'unsignedByte',
    });
    texture.bind(renderer);

    const fb = new GLFrameBuffer({
      color: texture,
    });
    renderer.draw({
      frameBuffer: fb,
      shader: BRDF_SHADER,
      geometry: BRDF_QUAD,
      uniforms: {
        uHammersleyMap: hammersleyMap,
      },
    });
    fb.dispose();
    hammersleyMap.dispose();

    return texture;
  });
}
