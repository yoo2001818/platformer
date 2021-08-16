import {Camera} from '../../3d/Camera';
import {TransformComponent} from '../../3d/TransformComponent';
import {EntityChunk} from '../../core/EntityChunk';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {Material} from '../Material';
import {Renderer} from '../Renderer';
import {createId} from '../utils/createId';
import {GLTexture} from '../gl/GLTexture';
import {ShaderBank} from '../ShaderBank';
import {CUBE_PACK, CUBE_PACK_HEADER} from '../shader/cubepack';
import {HDR} from '../shader/hdr';
import {getHDRType} from '../hdr/utils';
import {FILMIC} from '../shader/tonemap';

export interface SkyboxMaterialOptions {
  texture: GLTexture;
  lod: number;
}

const SHADER_BANK = new ShaderBank(
  (hdrType: string) => `${hdrType}`,
  (hdrType) => new GLShader(/* glsl */`
    #version 100
    precision highp float;

    attribute vec3 aPosition;

    varying vec2 vPosition;

    void main() {
      vPosition = aPosition.xy;
      gl_Position = vec4(aPosition.xy, 1.0, 1.0);
    }
  `, /* glsl */`
    #version 100
    ${CUBE_PACK_HEADER}
    #define HDR_INPUT_${hdrType}
    precision highp float;

    ${HDR}
    ${CUBE_PACK}
    ${FILMIC}

    varying vec2 vPosition;

    uniform sampler2D uTexture;
    uniform vec2 uTextureSize;
    uniform float uLod;
    uniform mat4 uInverseView;
    uniform mat4 uInverseProjection;

    void main() {
      vec4 viewPos = uInverseProjection * vec4(vPosition.xy, 1.0, 1.0);
      viewPos /= viewPos.w;
      vec3 dir = (uInverseView * vec4(normalize(viewPos.xyz), 0.0)).xyz;
      vec3 result = textureCubePackLodHDR(uTexture, dir, uLod, uTextureSize);
      // result = tonemap(result);
      gl_FragColor = vec4(result, 1.0);
    }
  `),
);

export class SkyboxMaterial implements Material {
  id: number;
  options: SkyboxMaterialOptions;
  mode: 'forward' = 'forward';
  constructor(options: SkyboxMaterialOptions) {
    this.id = createId();
    this.options = options;
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    const {options} = this;
    const {glRenderer, pipeline} = renderer;

    // Prepare shader uniforms
    const uniformOptions: {[key: string]: any;} = {
      uTexture: options.texture,
      uTextureSize: [
        1 / options.texture.getWidth(),
        1 / options.texture.getHeight(),
      ],
      uLod: options.lod,
    };

    const hdrType = getHDRType(glRenderer);

    const shader = SHADER_BANK.get(hdrType);

    chunk.forEach((entity) => {
      pipeline.drawForward({
        shader,
        geometry,
        uniforms: uniformOptions,
      });
    });
  }

  dispose(): void {
    SHADER_BANK.dispose();
  }
}
