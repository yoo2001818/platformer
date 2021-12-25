import {Engine} from '../../core/Engine';
import {combine} from '../../geom/combine';
import {quad} from '../../geom/quad';
import {transform} from '../../geom/transform';
import {GeometryOptions, LINES} from '../../geom/types';
import {GizmoEffect} from '../../render/effect/GizmoEffect';
import {GLGeometry} from '../../render/gl/GLGeometry';
import {GLShader} from '../../render/gl/GLShader';
import {GLTexture} from '../../render/gl/GLTexture';
import {GLTexture2D} from '../../render/gl/GLTexture2D';
import {GLTextureGenerated} from '../../render/gl/GLTextureGenerated';
import {Renderer} from '../../render/Renderer';
import {CursorModel} from '../models/CursorModel';

const QUAD_MODEL = new GLGeometry(quad());

const QUAD_SHADER = new GLShader(
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

const singleLine: GeometryOptions = {
  attributes: {
    aPosition: {
      data: [
        1.0, 0, 0,
        0.3, 0, 0,
        -0.3, 0, 0,
        -1.0, 0, 0,
      ],
      size: 3,
    },
  },
  mode: LINES,
};

const LINE_MODEL = new GLGeometry(combine([
  singleLine,
  transform(singleLine, {
    aPosition: [
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 0, 0, 1,
    ],
  }),
  transform(singleLine, {
    aPosition: [
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1,
    ],
  }),
]));

const LINE_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    uniform float uScale;
    
    void main() {
      mat4 mvp = uProjection * uView * uModel;
      // Determine the w value at the mid point
      vec4 midPos = mvp * vec4(0.0, 0.0, 0.0, 1.0);
      gl_Position = mvp * vec4(aPosition * uScale * midPos.w, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    uniform vec4 uColor;

    void main() {
      gl_FragColor = uColor;
    }
  `,
);

export interface CursorEffectProps {
  engine: Engine;
}

export class CursorEffect
implements GizmoEffect<CursorEffectProps> {
  renderer: Renderer | null = null;
  dotTexture: GLTexture;

  constructor() {
    this.dotTexture = new GLTextureGenerated({
      width: 32,
      height: 32,
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      minFilter: 'nearest',
      magFilter: 'nearest',
      mipmap: false,
      format: 'rgba',
    }, () => {
      // Use canvas to draw the circle
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      const maxRad = Math.PI * 2;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.strokeStyle = '#000000';
      ctx.arc(16, 16, 10, 0, maxRad);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 16; i += 1) {
        ctx.beginPath();
        ctx.strokeStyle = i % 2 === 0 ? '#FF3333' : '#EEEEEE';
        ctx.arc(16, 16, 10, i / 16 * maxRad, (i + 1) / 16 * maxRad);
        ctx.stroke();
      }
      // Create texture
      return new GLTexture2D({
        width: 32,
        height: 32,
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        minFilter: 'nearest',
        magFilter: 'nearest',
        mipmap: false,
        format: 'rgba',
        source: canvas,
      });
    });
  }

  bind(renderer: Renderer): void {
    this.renderer = renderer;
  }

  dispose(): void {

  }

  render(props: CursorEffectProps): void {
    const {renderer} = this;
    const {engine} = props;
    const {glRenderer, pipeline} = renderer!;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    const camUniforms = pipeline.getCameraUniforms();

    const cursor = engine.getModel<CursorModel>('cursor').getCursor();

    glRenderer.draw({
      geometry: QUAD_MODEL,
      shader: QUAD_SHADER,
      uniforms: {
        ...camUniforms,
        uModel: cursor,
        uTexture: this.dotTexture,
        uScale: [32 / width, 32 / height],
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
      geometry: LINE_MODEL,
      shader: LINE_SHADER,
      uniforms: {
        ...camUniforms,
        uModel: cursor,
        uColor: '#333333',
        uScale: 0.03,
      },
      state: {
        depth: false,
      },
    });
  }
}
