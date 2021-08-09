import {quad} from '../geom/quad';

import {GLFrameBuffer} from './gl/GLFrameBuffer';
import {GLGeometry} from './gl/GLGeometry';
import {GLRenderer} from './gl/GLRenderer';
import {GLShader} from './gl/GLShader';
import {GLTexture} from './gl/GLTexture';
import {GLTexture2D} from './gl/GLTexture2D';

const BAKE_QUAD = new GLGeometry(quad());
const BAKE_SHADER = new GLShader(
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
    #define PI 3.141592

    precision highp float;

    varying vec2 vPosition;

    uniform samplerCube uSource;

    float vanDerCorput(int n, int base) {
      float invBase = 1.0 / float(base);
      float denom   = 1.0;
      float result  = 0.0;

      for (int i = 0; i < 32; ++i) {
        if (n > 0) {
          denom = mod(float(n), 2.0);
          result += denom * invBase;
          invBase = invBase / 2.0;
          n = int(float(n) / 2.0);
        }
      }

      return result;
    }

    vec2 hammersleyNoBitOps(int i, int N) {
      return vec2(float(i)/float(N), vanDerCorput(i, 2));
    }

    vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
      float a = roughness * roughness;

      float phi = 2.0 * PI * Xi.x;
      float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
      float sinTheta = sqrt(1.0 - cosTheta*cosTheta);

      // from spherical coordinates to cartesian coordinates
      vec3 H;
      H.x = cos(phi) * sinTheta;
      H.y = sin(phi) * sinTheta;
      H.z = cosTheta;
    
      // from tangent-space vector to world-space sample vector
      vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
      vec3 tangent = normalize(cross(up, N));
      vec3 bitangent = cross(N, tangent);
    
      vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
      return normalize(sampleVec);
    }

    vec4 runSample(vec3 direction, float roughness) {
      vec3 N = normalize(direction);    
      vec3 R = N;
      vec3 V = R;

      const int SAMPLE_COUNT = 1024;
      float totalWeight = 0.0;   
      vec4 prefilteredColor = vec4(0.0);     
      for (int i = 0; i < SAMPLE_COUNT; ++i) {
        vec2 Xi = hammersleyNoBitOps(i, SAMPLE_COUNT);
        vec3 H = importanceSampleGGX(Xi, N, roughness);
        vec3 L = normalize(2.0 * dot(V, H) * H - V);

        float NdotL = max(dot(N, L), 0.0);
        if (NdotL > 0.0) {
          prefilteredColor += textureCube(uSource, L) * NdotL;
          totalWeight += NdotL;
        }
      }
      prefilteredColor = prefilteredColor / totalWeight;

      return prefilteredColor;
    }

    void main() {
      // Retrieve mipmap level
      vec2 logPos = floor(-log2(1.0 - vPosition));
      float mipLevel = min(logPos.x, logPos.y);
      float mipBounds = pow(2.0, -mipLevel);
      float mipStart = 1.0 - mipBounds;
      vec2 mipPos = (vPosition - mipStart) / mipBounds;
      // Retrieve axis
      // Y
      // ^ Z- /
      // | Z+ /
      // | X- Y-
      // | X+ Y+
      // +------> X
      vec2 blockPos = fract(mipPos * vec2(2.0, 4.0)) * 2.0 - 1.0;
      vec3 front;
      vec3 up;
      vec3 right;
      if (mipPos.y >= 0.5) {
        front = vec3(0.0, 0.0, 1.0);
        up = vec3(0.0, 1.0, 0.0);
      } else if (mipPos.x <= 0.5) {
        front = vec3(1.0, 0.0, 0.0);
        up = vec3(0.0, 1.0, 0.0);
      } else {
        front = vec3(0.0, 1.0, 0.0);
        up = vec3(0.0, 0.0, 1.0);
      }
      if (mod(mipPos.y, 0.5) >= 0.25) {
        front = front * -1.0;
        up = up * vec3(1.0, 1.0, -1.0);
      }
      right = cross(front, up);
      vec3 coord = front + up * blockPos.y + right * blockPos.x;
      // Run radiance / irradiance calculation
      vec4 result = runSample(coord, min(mipLevel / 6.0, 1.0));
      gl_FragColor = vec4(result.rgb, 1.0);
    }
  `,
);

// This accepts a cubemap and generates an environment map for PBR, which
// contains number of cubemap samples on 2D texture.
export function generatePBREnvMap(
  renderer: GLRenderer,
  source: GLTexture,
  target: GLTexture2D,
): void {
  // We won't care about the size of the target - it doesn't matter.
  // However it is still needed for framebuffer generation..
  const {width, height} = target.options;
  if (width == null || height == null) {
    throw new Error('The width/height of target buffer must be specified');
  }
  const fb = new GLFrameBuffer({
    color: target,
    width,
    height,
  });
  fb.bind(renderer);

  const {gl} = renderer;
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Because of the texture structure, we can perform everything on single
  // draw call. Let's do that first.
  BAKE_SHADER.bind(renderer);
  BAKE_QUAD.bind(renderer, BAKE_SHADER);
  BAKE_SHADER.setUniforms({
    uSource: source,
  });
  BAKE_QUAD.draw();

  fb.unbind();
}
