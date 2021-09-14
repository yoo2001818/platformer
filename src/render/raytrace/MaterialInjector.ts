import {quad} from '../../geom/quad';
import {Atlas, AtlasItem} from '../Atlas';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture} from '../gl/GLTexture';
import {GLTexture2D} from '../gl/GLTexture2D';
import {convertFloatArray} from '../gl/uniform/utils';
import {Material} from '../Material';
import {StandardMaterial} from '../material/StandardMaterial';
import {Mesh} from '../Mesh';
import {Renderer} from '../Renderer';

import {
  BVHTextureChildInjector,
  BVHTextureChildInjectorResult,
  BVHTextureChildValue,
} from './BVHTexture';

const TEX_MAPPER_QUAD = new GLGeometry(quad());
const TEX_MAPPER_SHADER = new GLShader(
  /* glsl */`
    #version 100
    precision highp float;

    attribute vec3 aPosition;

    varying vec2 vPosition;

    uniform vec4 uBounds;

    void main() {
      vPosition = aPosition.xy * 0.5 + 0.5;
      gl_Position = vec4(
        (vPosition * uBounds.zw + uBounds.xy) * 2.0 - 1.0,
        1.0,
        1.0
      );
    }
  `,
  /* glsl */`
    precision highp float;

    varying vec2 vPosition;

    uniform sampler2D uTexture;

    void main() {
      gl_FragColor = texture2D(uTexture, vPosition);
    }
  `,
);

export class MaterialInjector implements BVHTextureChildInjector {
  renderer: Renderer;
  atlas: Atlas;
  textureAtlasMap: Map<number, AtlasItem>;
  texture: GLTexture2D;
  frameBuffer: GLFrameBuffer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.atlas = new Atlas();
    this.textureAtlasMap = new Map();
    this.texture = new GLTexture2D({
      format: 'rgba',
      type: 'unsignedByte',
      width: 2,
      height: 2,
      magFilter: 'linear',
      minFilter: 'linear',
      mipmap: false,
      source: null,
    });
    this.frameBuffer = new GLFrameBuffer({
      color: this.texture,
      width: 2,
      height: 2,
    });
  }

  updateTexture(entries: [GLTexture, AtlasItem][]): void {
    const {glRenderer} = this.renderer;
    const width = this.atlas.getWidth();
    const height = this.atlas.getHeight();
    if (this.atlas.isResized) {
      // Reset the texture...
      this.texture.setOptions({
        ...this.texture.options,
        width,
        height,
      });
      this.frameBuffer.options.width = width;
      this.frameBuffer.options.height = height;
    }
    entries.forEach((entry) => {
      const [texture, atlasItem] = entry;
      if (this.atlas.isResized || atlasItem.isUpdated) {
        // Reupload the texture
        glRenderer.draw({
          frameBuffer: this.frameBuffer,
          shader: TEX_MAPPER_SHADER,
          geometry: TEX_MAPPER_QUAD,
          uniforms: {
            uTexture: texture,
            uBounds: [
              atlasItem.x / width,
              atlasItem.y / height,
              atlasItem.width / width,
              atlasItem.height / height,
            ],
          },
          state: {
            depth: false,
          },
        });
      }
      atlasItem.isUpdated = false;
    });
    this.atlas.isResized = false;
  }

  _getTextureAtlas(texture: GLTexture): AtlasItem {
    const entry = this.textureAtlasMap.get(texture.id);
    if (entry == null) {
      // FIXME: Texture is asynchronously loaded; therefore it may not exist
      // when this is being called. For the time being, let's just use 512
      const width = texture.getWidth() ?? 512;
      const height = texture.getHeight() ?? 512;
      const newEntry = this.atlas.allocate(width, height);
      this.textureAtlasMap.set(texture.id, newEntry);
      return newEntry;
    }
    return entry;
  }

  inject(children: BVHTextureChildValue[]): BVHTextureChildInjectorResult {
    // This stores actual material data of the mesh in the BVH texture.
    // Since the material data is highly versatile, it's separated to a separate
    // function.

    // Well, not much is needed here...
    // - roughness, metalic, albedoMap?, normalMap?
    // - albedoColor
    // - albedoUV?
    // - normalUV?
    // (wip) - metalicUV?
    // (wip) - roughnessUV?

    const materials: Material[] = [];
    const childMaterialIds = children.map(([entity, geomId]) => {
      const mesh = entity.get<Mesh>('mesh')!;
      const materialId = Math.min(mesh.materials.length - 1, geomId);
      const material = mesh.materials[materialId];
      const index = materials.findIndex((v) => v === material);
      if (index !== -1) {
        return index;
      }
      materials.push(material);
      return materials.length - 1;
    });
    // Build atlas data used in the scene
    const atlasEntries: [GLTexture, AtlasItem][] = [];
    materials.forEach((material) => {
      if (material instanceof StandardMaterial) {
        const {options} = material;
        if (options.albedo instanceof GLTexture) {
          const atlasItem = this._getTextureAtlas(options.albedo);
          atlasEntries.push([options.albedo, atlasItem]);
        }
      }
    });
    const count = materials.length * 4;
    this.updateTexture(atlasEntries);

    return {
      texels: count,
      getOffset: (index, startOffset) =>
        startOffset + childMaterialIds[index] * 4,
      write: (output, startOffset) => {
        materials.forEach((material, i) => {
          const addr = (startOffset + i * 4) * 4;
          if (material instanceof StandardMaterial) {
            const {options} = material;
            if (options.roughness instanceof GLTexture) {
              output[addr] = -1;
            } else {
              output[addr] = options.roughness;
            }
            if (options.metalic instanceof GLTexture) {
              output[addr + 1] = -1;
            } else {
              output[addr + 1] = options.metalic;
            }
            if (options.albedo instanceof GLTexture) {
              const atlasItem = this._getTextureAtlas(options.albedo);
              output[addr + 2] = 1;
              for (let i = 0; i < 3; i += 1) {
                output[addr + 4 + i] = 1;
              }
              output[addr + 8] = atlasItem.x / this.atlas.getWidth();
              output[addr + 9] = atlasItem.y / this.atlas.getHeight();
              output[addr + 10] = atlasItem.width / this.atlas.getWidth();
              output[addr + 11] = atlasItem.height / this.atlas.getHeight();
            } else {
              output[addr + 2] = 0;
              const albedo = convertFloatArray(options.albedo, 3);
              for (let i = 0; i < 3; i += 1) {
                output[addr + 4 + i] = albedo[i];
              }
            }
          } else {
            // Unsupported material; just fill it with something random
            output[addr] = 0.5;
            output[addr + 1] = 0;
            output[addr + 2] = 0;
            output[addr + 3] = 0;
            output[addr + 4] = 1;
            output[addr + 5] = 1;
            output[addr + 6] = 1;
          }
        });
      },
    };
  }
}
