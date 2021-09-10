import {EntityStore} from '../../core/EntityStore';
import {GLTexture2D} from '../gl/GLTexture2D';

import {WorldBVH} from './WorldBVH';

export class BVHTexture {
  entityStore: EntityStore;
  worldBVH: WorldBVH;
  bvhTexture: GLTexture2D;

  constructor(
    entityStore: EntityStore,
    worldBVH: WorldBVH,
  ) {
    this.entityStore = entityStore;
    this.worldBVH = worldBVH;
    this.bvhTexture = new GLTexture2D({
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      format: 'rgba',
      type: 'float',
      width: 1,
      height: 1,
      source: null,
    });
  }

  update(): void {
    // The BVH needs the following data:
    // Each BVH Node:
    // - min: vec3
    // - max: vec3
    // - left/offset: float
    // - right/length: float
    // -> 2 texels
    // Leaf data section:
    // TLAS leaf data:
    // - min: vec3
    // - max: vec3
    // - invMatrix: mat4
    // - matrix: mat4
    // - materialId: float
    // - blasNodeId: float
    // - dataOffset: float
    // -> 10 texels
    // BLAS leaf data:
    // - faceId: float
    // - vertexId: float[3]
    // - positions: vec3[3]
    // - normals: vec3[3]
    // - tangents: vec3[3]
    // - texCoords: vec3[3]
    // -> 4 texels
  }
}
