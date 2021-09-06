import {Camera} from '../../3d/Camera';
import {TransformComponent} from '../../3d/TransformComponent';
import {EntityChunk} from '../../core/EntityChunk';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {Material} from '../Material';
import {Renderer} from '../Renderer';
import {ShadowPipeline} from '../shadow/ShadowPipeline';
import {createId} from '../utils/createId';

export type ShaderMaterialUniformSetter =
| {[key: string]: unknown;}
| ((renderer: Renderer) => {[key: string]: unknown;});

export class ShaderMaterial implements Material {
  id: number;
  vert: string;
  frag: string;
  glShader: GLShader;
  uniforms: ShaderMaterialUniformSetter;
  mode: 'forward' = 'forward';

  constructor(
    vert: string,
    frag: string,
    uniforms: ShaderMaterialUniformSetter = {},
  ) {
    this.id = createId();
    this.vert = vert;
    this.frag = frag;
    this.glShader = new GLShader(vert, frag);
    this.uniforms = uniforms;
  }

  renderShadow(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    shadowPipeline: ShadowPipeline,
  ): void {
    const {entityStore} = renderer;
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const shader = shadowPipeline.getShader(`shader-${this.id}`, () => ({
      vert: this.vert,
    }));
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      shadowPipeline.draw({
        shader,
        geometry,
        uniforms: {
          uModel: transform.getMatrixWorld(),
        },
      });
    });
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    const {glRenderer, entityStore, camera} = renderer;

    // Prepare shader uniforms
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const cameraData = camera!.get<Camera>('camera')!;

    // Bind the shaders
    this.glShader.bind(glRenderer);
    geometry.bind(glRenderer, this.glShader);

    // Set uniforms and issue draw call
    this.glShader.setUniforms({
      uView: cameraData.getView(camera!),
      uProjection: cameraData.getProjection(renderer.getAspectRatio()),
      uInverseView: () => cameraData.getInverseView(camera!),
      uInverseProjection: () =>
        cameraData.getInverseProjection(renderer.getAspectRatio()),
    });
    if (typeof this.uniforms === 'function') {
      this.glShader.setUniforms(this.uniforms(renderer));
    } else {
      this.glShader.setUniforms(this.uniforms);
    }
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      // Set uniforms and draw the element
      this.glShader.setUniforms({
        uModel: transform.getMatrixWorld(),
      });
      geometry.draw();
    });
  }

  dispose(): void {
    this.glShader.dispose();
  }
}
