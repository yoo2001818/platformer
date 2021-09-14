import {Atlas, AtlasItem} from '../Atlas';
import {GLTexture} from '../gl/GLTexture';
import {convertFloatArray} from '../gl/uniform/utils';
import {Material} from '../Material';
import {StandardMaterial} from '../material/StandardMaterial';
import {Mesh} from '../Mesh';

import {
  BVHTextureChildInjector,
  BVHTextureChildInjectorResult,
  BVHTextureChildValue,
} from './BVHTexture';

export class MaterialInjector implements BVHTextureChildInjector {
  atlas: Atlas;
  textureAtlasMap: Map<number, AtlasItem>;

  constructor() {
    this.atlas = new Atlas();
    this.textureAtlasMap = new Map();
  }

  updateTexture(entries: [GLTexture, AtlasItem][]): void {
    entries.forEach((entry) => {
      const [texture, atlasItem] = entry;
      if (this.atlas.isResized || atlasItem.isUpdated) {
        // Reupload the texture
      }
      atlasItem.isUpdated = false;
    });
    this.atlas.isResized = false;
  }

  _getTextureAtlas(texture: GLTexture): AtlasItem {
    const entry = this.textureAtlasMap.get(texture.id);
    if (entry == null) {
      const newEntry =
        this.atlas.allocate(texture.getWidth(), texture.getHeight());
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
              for (let i = 0; i < 3; i += 1) {
                output[addr + 4 + i] = 1;
              }
              output[8] = atlasItem.x / this.atlas.getWidth();
              output[9] = atlasItem.y / this.atlas.getHeight();
              output[10] = atlasItem.width / this.atlas.getWidth();
              output[11] = atlasItem.height / this.atlas.getHeight();
            } else {
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
