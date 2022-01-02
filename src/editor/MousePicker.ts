import {TransformComponent} from '../3d/TransformComponent';
import {Entity} from '../core/Entity';
import {quad} from '../geom/quad';
import {GLArrayBuffer} from '../render/gl/GLArrayBuffer';
import {GLFrameBuffer} from '../render/gl/GLFrameBuffer';
import {GLGeometry} from '../render/gl/GLGeometry';
import {GLRenderBuffer} from '../render/gl/GLRenderBuffer';
import {GLShader} from '../render/gl/GLShader';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {Renderer} from '../render/Renderer';

export class MousePicker {
  renderer: Renderer;
  colorTex: GLTexture2D;
  depthTex: GLRenderBuffer;
  renderFb: GLFrameBuffer;
  instancedBuffer: GLArrayBuffer;

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
      format: 'depthStencil',
    });
    this.renderFb = new GLFrameBuffer({
      color: this.colorTex,
      depthStencil: this.depthTex,
    });
    this.instancedBuffer = new GLArrayBuffer(null, 'stream');
  }

  dispose(): void {
    this.colorTex.dispose();
    this.depthTex.dispose();
    this.renderFb.dispose();
    this.instancedBuffer.dispose();
  }

  render(): void {
    const {renderer} = this;
    const {glRenderer, pipeline, entityStore} = renderer;
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
    // Render all meshes on the screen first
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
              vec4 enc = vec4(mod(floor(vec4(vEntityId + 0.001) / encTable), 255.0) / 255.0);
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
    // Then, render all non-mesh entities (perferably with instancing)
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const nonmeshShader = renderer.getResource('mousepick-nonmesh-s', () => {
      return new GLShader(
        /* glsl */`
          precision highp float;

          attribute vec3 aPosition;
          attribute vec4 aInstanced;

          varying float vEntityId;

          uniform mat4 uView;
          uniform mat4 uProjection;
          uniform vec2 uScale;

          void main() {
            vEntityId = aInstanced.w;
            mat4 mvp = uProjection * uView;
            vec4 pos = mvp * vec4(aInstanced.xyz, 1.0);
            pos.xy += aPosition.xy * uScale * pos.w;
            gl_Position = pos;
          }
        `,
        /* glsl */`
          precision highp float;

          varying float vEntityId;
          
          const vec4 encTable = vec4(1.0, 255.0, 65025.0, 16581375.0);

          void main() {
            vec4 enc = vec4(mod(floor(vec4(vEntityId + 0.001) / encTable), 255.0) / 255.0);
            gl_FragColor = enc;
          }
        `,
      );
    });
    const nonmeshGeom = renderer.getResource('mousepick-nonmesh-g', () => {
      return new GLGeometry(quad());
    });
    entityStore.forEachChunkWith(['transform'], (chunk) => {
      if (chunk.has('mesh')) {
        return;
      }
      const buffer = new Float32Array(chunk.size * 4);
      let index = 0;
      for (let i = 0; i < chunk.maxOffset; i += 1) {
        const entity = chunk.getAt(i);
        if (entity == null) {
          continue;
        }
        const transform = entity.get(transformComp);
        buffer.set(transform!.getPositionWorld(), index * 4);
        buffer[index * 4 + 3] = entity.handle.id;
        index += 1;
      }
      this.instancedBuffer.set(buffer);
      nonmeshShader.bind(glRenderer);
      nonmeshShader.setAttribute('aInstanced', {
        buffer: this.instancedBuffer,
        divisor: 1,
      });
      glRenderer.draw({
        geometry: nonmeshGeom,
        shader: nonmeshShader,
        frameBuffer: this.renderFb,
        uniforms: {
          ...cameraUniforms,
          uScale: [8 / width, 8 / height],
        },
        primCount: chunk.size,
      });
    });
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
