import {Entity} from '../core/Entity';
import {GLFrameBuffer} from '../render/gl/GLFrameBuffer';
import {GLRenderBuffer} from '../render/gl/GLRenderBuffer';
import {GLShader} from '../render/gl/GLShader';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {Renderer} from '../render/Renderer';

export class MousePicker {
  renderer: Renderer;
  colorTex: GLTexture2D;
  depthTex: GLRenderBuffer;
  renderFb: GLFrameBuffer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.colorTex = new GLTexture2D({
      width: 1,
      height: 1,
      type: 'unsignedByte',
      format: 'rgba',
      magFilter: 'nearest',
      minFilter: 'nearest',
      mipmap: false,
    });
    this.depthTex = new GLRenderBuffer({
      width: 1,
      height: 1,
      format: 'depth24stencil8',
    });
    this.renderFb = new GLFrameBuffer({
      color: this.colorTex,
      depthStencil: this.depthTex,
    });
  }

  dispose(): void {
    this.colorTex.dispose();
    this.depthTex.dispose();
    this.renderFb.dispose();
  }

  render(): void {
    const {renderer} = this;
    const {glRenderer, pipeline} = renderer;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    this.colorTex.updateSize(width, height);
    this.depthTex.updateSize(width, height);
    const cameraUniforms = pipeline.getCameraUniforms();
    glRenderer.clear(
      this.renderFb,
      undefined,
      [1, 1, 1, 1],
    );
    pipeline.renderVertex(
      (id, onCreate) => renderer.getResource(`mousepick~${id}`, () => {
        const block = onCreate();
        return new GLShader(
          block.vert,
          /* glsl */`
            #version 100
            precision highp float;

            varying float vEntityId;
            
            const vec4 encTable = vec4(1.0, 255.0, 65025.0, 16581375.0);

            void main() {
              vec4 enc = vec4(mod(floor(vec4(vEntityId) / encTable), 255.0) / 255.0);
              gl_FragColor = enc;
            }
          `,
        );
      }),
      (options) => {
        glRenderer.draw({
          ...options,
          frameBuffer: this.renderFb,
          uniforms: {
            ...cameraUniforms,
            ...options.uniforms,
          },
        });
      },
    );
  }

  getId(x: number, y: number): number {
    const buffer = new Uint8Array(4);
    this.renderFb.bind(this.renderer.glRenderer);
    this.renderFb.readPixels(x, y, 1, 1, 'rgba', 'unsignedByte', buffer);
    // Try to map the value to ID
    let value = buffer[3];
    value = value * 255 + buffer[2];
    value = value * 255 + buffer[1];
    value = value * 255 + buffer[0];
    return value;
  }

  getEntity(x: number, y: number): Entity | null {
    const {entityStore} = this.renderer;
    const id = this.getId(x, y);
    return entityStore.getById(id);
  }
}
