import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {quad} from '../../geom/quad';
import {GizmoEffect} from '../../render/effect/GizmoEffect';
import {GLGeometry} from '../../render/gl/GLGeometry';
import {GLShader} from '../../render/gl/GLShader';
import {GLTexture} from '../../render/gl/GLTexture';
import {GLTexture2D} from '../../render/gl/GLTexture2D';
import {GLTextureGenerated} from '../../render/gl/GLTextureGenerated';
import {Renderer} from '../../render/Renderer';

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

export interface SelectedDotEffectProps {
  entity: Entity | null;
}

export class SelectedDotEffect
implements GizmoEffect<SelectedDotEffectProps> {
  renderer: Renderer | null = null;
  dotTexture: GLTexture;

  constructor() {
    this.dotTexture = new GLTextureGenerated({
      width: 16,
      height: 16,
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      minFilter: 'nearest',
      magFilter: 'nearest',
      mipmap: false,
      format: 'rgba',
    }, () => {
      // Use canvas to draw the circle
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#FF6D00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(8, 8, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
      // Create texture
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
  }

  bind(renderer: Renderer): void {
    this.renderer = renderer;
  }

  dispose(): void {

  }

  render(props: SelectedDotEffectProps): void {
    const {renderer} = this;
    const {glRenderer, pipeline} = renderer!;
    const {entity} = props;
    if (entity == null) {
      return;
    }
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    const camUniforms = pipeline.getCameraUniforms();

    const transform = entity.get<Transform>('transform');
    if (transform == null) {
      return;
    }

    glRenderer.draw({
      geometry: QUAD_MODEL,
      shader: QUAD_SHADER,
      uniforms: {
        ...camUniforms,
        uModel: transform.getMatrixWorld(),
        uTexture: this.dotTexture,
        uScale: [16 / width, 16 / height],
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
  }
}
