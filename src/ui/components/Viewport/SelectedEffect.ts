import {Camera} from '../../../3d/Camera';
import {Transform} from '../../../3d/Transform';
import {quad} from '../../../geom/quad';
import {GizmoEffect} from '../../../render/effect/GizmoEffect';
import {GLFrameBuffer} from '../../../render/gl/GLFrameBuffer';
import {GLGeometry} from '../../../render/gl/GLGeometry';
import {GLRenderBuffer} from '../../../render/gl/GLRenderBuffer';
import {GLShader} from '../../../render/gl/GLShader';
import {GLTexture2D} from '../../../render/gl/GLTexture2D';
import {Mesh} from '../../../render/Mesh';
import {Renderer} from '../../../render/Renderer';
import {selectedEntity} from '../../states/selection';

const QUAD = new GLGeometry(quad());
const OFF_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    
    void main() {
      gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `,
);
const LINE_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;

    varying vec2 vTexCoord;
    
    void main() {
      vTexCoord = aPosition.xy * 0.5 + 0.5;
      gl_Position = vec4(aPosition.xy, 1.0, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    varying vec2 vTexCoord;

    uniform sampler2D uLineMap;
    uniform vec2 uResolution;
    uniform vec3 uColor;

    void main() {
      float centerValue = texture2D(uLineMap, vTexCoord).r;
      float sumValue = 0.0;
      for (int x = -1; x <= 1; x += 1) {
        for (int y = -1; y <= 1; y += 1) {
          sumValue += texture2D(uLineMap, vTexCoord + vec2(float(x), float(y)) / uResolution).r;
        }
      }
      if (abs(sumValue / 9.0 - centerValue) < 0.000001) {
        discard;
      }
      gl_FragColor = vec4(uColor, 1.0);
    }
  `,
);

export class SelectedEffect implements GizmoEffect {
  renderer: Renderer;
  lineTex: GLTexture2D;
  lineDepth: GLRenderBuffer;
  lineFrameBuffer: GLFrameBuffer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    // Since WebGL only supports 1px for lineWidth, we have to find another
    // way to implement outlines.
    // The most feasible way to do this is, to render the object in the
    // offscreen buffer and run sobel-like filter in the screen.
    // Therefore, we need screen-sized buffer to achieve this.
    const {glRenderer} = renderer;
    this.lineTex = new GLTexture2D({
      width: glRenderer.getWidth(),
      height: glRenderer.getHeight(),
      type: 'unsignedByte',
      format: glRenderer.capabilities.isWebGL2 ? 'red' : 'rgba',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      magFilter: 'nearest',
      minFilter: 'nearest',
      mipmap: false,
    });
    this.lineDepth = new GLRenderBuffer({
      format: 'depthComponent24',
      width: glRenderer.getWidth(),
      height: glRenderer.getHeight(),
    });
    this.lineFrameBuffer = new GLFrameBuffer({
      color: this.lineTex,
      depth: this.lineDepth,
      width: glRenderer.getWidth(),
      height: glRenderer.getHeight(),
    });
  }

  dispose(): void {
    this.lineTex.dispose();
    this.lineDepth.dispose();
    this.lineFrameBuffer.dispose();
  }

  render(deltaTime?: number): void {
    const {renderer} = this;
    const {glRenderer, entityStore} = renderer;
    const entityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(entityHandle);
    if (entity == null) {
      return;
    }
    const camera = renderer.camera!;
    const cameraData = camera.get<Camera>('camera')!;

    const mesh = entity.get<Mesh>('mesh');
    const transform = entity.get<Transform>('transform');
    if (mesh == null || transform == null) {
      return;
    }

    // Render object onto the off-screen buffer.
    glRenderer.clear(this.lineFrameBuffer);
    mesh.geometries.forEach((geom) => {
      glRenderer.draw({
        frameBuffer: this.lineFrameBuffer,
        geometry: geom.getGLGeometry(renderer),
        shader: OFF_SHADER,
        uniforms: {
          uModel: transform.getMatrixWorld(),
          uView: cameraData.getView(camera),
          uProjection: cameraData.getProjection(renderer.getAspectRatio()),
        },
      });
    });

    // Copy the rendered off-screen buffer to the screen.
    glRenderer.draw({
      geometry: QUAD,
      shader: LINE_SHADER,
      uniforms: {
        uLineMap: this.lineTex,
        uResolution: [glRenderer.getWidth(), glRenderer.getHeight()],
        uColor: '#FF4800',
      },
      state: {
        depth: false,
      },
    });
  }
}
