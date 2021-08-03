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
      attribute vec2 aTexCoord;
      attribute vec3 aInstanced;

      uniform mat4 uView;
      uniform mat4 uProjection;
      uniform mat4 uModel;

      varying vec2 vTexCoord;

      void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition + aInstanced, 1.0);
        vTexCoord = aTexCoord;
      } 
    `, `
      #version 100
      precision highp float;

      varying vec2 vTexCoord;

      void main() {
        gl_FragColor = vec4(vTexCoord.rg * 0.5 + 0.5, 0.0, 1.0);
      } 
    `);
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    // Bind the shaders
    const {glRenderer, entityStore} = renderer;
    this.shader.bind(glRenderer);
    geometry.bind(glRenderer, this.shader);

    // Get the necessary components
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
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
