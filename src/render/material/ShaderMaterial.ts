import {TransformComponent} from '../../3d/TransformComponent';
import {EntityChunk} from '../../core/EntityChunk';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {Material, MaterialVertexShaderBlock} from '../Material';
import {Renderer} from '../Renderer';
import {createId} from '../utils/createId';
import {DrawOptions} from '../gl/types';

export type ShaderMaterialUniformSetter =
| {[key: string]: unknown;}
| ((renderer: Renderer) => {[key: string]: unknown;});

export class ShaderMaterial implements Material {
  id: number;
  name: string;
  vert: string;
  frag: string;
  glShader: GLShader;
  uniforms: ShaderMaterialUniformSetter;
  mode: 'forward' = 'forward';

  constructor(
    name: string,
    vert: string,
    frag: string,
    uniforms: ShaderMaterialUniformSetter = {},
  ) {
    this.id = createId();
    this.name = name;
    this.vert = vert;
    this.frag = frag;
    this.glShader = new GLShader(vert, frag);
    this.uniforms = uniforms;
  }

  renderVertex(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    onGetShader: (
      id: string,
      onCreate: (defines?: string) => MaterialVertexShaderBlock,
    ) => GLShader,
    onDraw: (options: DrawOptions) => void,
  ): void {
    const {entityStore} = renderer;
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const shader = onGetShader(`shader-${this.id}`, () => ({
      vert: this.vert,
    }));
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      onDraw({
        shader,
        geometry,
        uniforms: {
          uModel: transform.getMatrixWorld(),
          uEntityId: entity.handle.id,
        },
      });
    });
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    const {pipeline, entityStore} = renderer;

    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;

    let uniforms: {[key: string]: unknown;};
    if (typeof this.uniforms === 'function') {
      uniforms = this.uniforms(renderer);
    } else {
      uniforms = this.uniforms;
    }
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      // Set uniforms and draw the element
      pipeline.drawForward({
        shader: this.glShader,
        geometry,
        uniforms: {
          uModel: transform.getMatrixWorld(),
          ...uniforms,
        },
      });
    });
  }

  dispose(): void {
    this.glShader.dispose();
  }
}
