import {circleLine} from '../../geom/circleLine';
import {quad} from '../../geom/quad';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D} from '../gl/GLTexture2D';
import {GLTextureGenerated} from '../gl/GLTextureGenerated';

export const GIZMO_QUAD_MODEL = new GLGeometry(quad());

export const GIZMO_QUAD_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;
    attribute vec2 aTexCoord;

    varying vec2 vTexCoord;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    uniform vec2 uScale;

    void main() {
      vTexCoord = aTexCoord;
      mat4 mvp = uProjection * uView * uModel;
      // Determine the NDC of the center position
      vec4 centerPos = mvp * vec4(0.0, 0.0, 0.0, 1.0);
      centerPos /= centerPos.w;
      // Calculate in screen space...
      gl_Position = vec4(centerPos.xy + aPosition.xy * uScale, 0.0, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    varying vec2 vTexCoord;

    uniform sampler2D uTexture;

    void main() {
      gl_FragColor = texture2D(uTexture, vTexCoord);
    }
  `,
);

export const GIZMO_CIRCLE_MODEL = new GLGeometry(circleLine(24));

export const GIZMO_CIRCLE_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    uniform float uScale;

    void main() {
      mat4 mvp = uProjection * uView * uModel;
      // Determine the NDC of the center position
      vec4 pos = mvp * vec4(0.0, 0.0, 0.0, 1.0);
      // Determine size in NDC space
      vec3 ndcScale = (uProjection * vec4(1.0, 1.0, 0.0, 0.0)).xyz;
      pos.xyz += aPosition * ndcScale * uScale;
      pos /= pos.w;
      gl_Position = vec4(pos.xy, 0.0, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    uniform vec3 uColor; 

    void main() {
      gl_FragColor = vec4(uColor, 1.0);
    }
  `,
);

export const POINT_LIGHT_TEX = new GLTextureGenerated({
  width: 32,
  height: 32,
  wrapS: 'clampToEdge',
  wrapT: 'clampToEdge',
  minFilter: 'nearest',
  magFilter: 'nearest',
  mipmap: false,
  format: 'rgba',
}, () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(16, 16, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([2.1, 2.1]);
  ctx.beginPath();
  ctx.arc(16, 16, 10, 0, Math.PI * 2);
  ctx.stroke();
  return new GLTexture2D({
    width: 16,
    height: 16,
    wrapS: 'clampToEdge',
    wrapT: 'clampToEdge',
    minFilter: 'nearest',
    magFilter: 'nearest',
    mipmap: false,
    format: 'rgba',
    source: canvas,
  });
});
