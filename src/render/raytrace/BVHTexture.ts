import {BVHLeafNode, BVHNode} from '../../3d/BVH';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {EntityStore} from '../../core/EntityStore';
import {Geometry} from '../Geometry';
import {GLTexture2D} from '../gl/GLTexture2D';

import {WorldBVH} from './WorldBVH';

// NOTE: This is in TEXELS, not Float32Array offset
const BVH_SIZE = 2;
const TLAS_SIZE = 10;
const BLAS_SIZE = 8;

export type BVHTextureChildValue = [Entity, number, Geometry, Float32Array];

export interface BVHTextureChildInjectorResult {
  texels: number;
  getOffset(index: number, startOffset: number): number;
  write(output: Float32Array, startOffset: number): void;
}

export interface BVHTextureChildInjector {
  inject(children: BVHTextureChildValue[]): BVHTextureChildInjectorResult;
}

const DEFAULT_INJECTOR: BVHTextureChildInjector = {
  inject: (children) => ({
    texels: 0,
    getOffset: (index) => index,
    write: () => {},
  }),
};

export class BVHTexture {
  entityStore: EntityStore;
  worldBVH: WorldBVH;
  childInjector: BVHTextureChildInjector;
  bvhBuffer: Float32Array | null;
  bvhTexture: GLTexture2D;
  lastVersion = -1;

  constructor(
    entityStore: EntityStore,
    worldBVH: WorldBVH,
    injector: BVHTextureChildInjector = DEFAULT_INJECTOR,
  ) {
    this.entityStore = entityStore;
    this.worldBVH = worldBVH;
    this.childInjector = injector;
    this.bvhBuffer = null;
    this.bvhTexture = new GLTexture2D({
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      format: 'rgba',
      type: 'float',
      width: 1,
      height: 1,
      mipmap: false,
      source: null,
    });
  }

  dispose(): void {
    this.bvhTexture.dispose();
  }

  update(): void {
    this.worldBVH.update();
    if (this.worldBVH.lastVersion === this.lastVersion) {
      return;
    }
    this.lastVersion = this.worldBVH.lastVersion;
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
    // - matrix: mat4 - We don't need it if we can calculate
    //   everything in the model space...
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
    // We put EVERYTHING in ONE texture. This should be okay, since 8192x8192
    // texture can store about 67 million texels, which is more than enough.
    // (If the scene exceeds this count, it shouldn't be rendered like this
    // anyway)

    // First, calculate the layout of the BVH. It's used to determine the size
    // of the texture...
    const {worldBVH} = this;
    const rootBVH = worldBVH.bvh!;
    const children = worldBVH.children!;
    // Retrieve child injector's result.
    const childInjectorResult = this.childInjector.inject(children);
    // Determine the set of geometries used in the world.
    const geometries: Geometry[] = [];
    const childrenGeomIds = children.map((child) => {
      const geometry = child[2];
      const index = geometries.findIndex((v) => v === geometry);
      if (index !== -1) {
        return index;
      }
      geometries.push(child[2]);
      return geometries.length - 1;
    });
    let bvhNodeCount = rootBVH.nodeCount;
    const tlasLeafCount = children.length;
    let blasLeafCount = 0;
    geometries.forEach((geometry) => {
      const geomBVH = geometry.getBVH();
      bvhNodeCount += geomBVH.nodeCount;
      blasLeafCount += geomBVH.indices.length;
    });

    const requiredTexels =
      bvhNodeCount * BVH_SIZE +
      tlasLeafCount * TLAS_SIZE +
      blasLeafCount * BLAS_SIZE +
      childInjectorResult.texels;

    console.log('BVH nodes', bvhNodeCount);
    console.log('TLAS leaves', tlasLeafCount);
    console.log('BLAS leaves', blasLeafCount);
    console.log('required texels', requiredTexels);

    // Determine the width / height of the resulting texture. For simplicity,
    // we'll just use multiples of 1024.
    const width = 1024;
    const height = Math.ceil(requiredTexels / 1024);

    const output = new Float32Array(width * height * 4);

    let bvhOffset = 0;
    // Fill in TLAS BVH data
    const tlasLeafBase = bvhNodeCount * BVH_SIZE;
    bvhOffset = fillBVH(
      rootBVH.root,
      output,
      bvhOffset,
      (node) => tlasLeafBase + node.offset * TLAS_SIZE,
    );
    // Fill in BLAS BVH data
    const blasLeafBase = tlasLeafBase + tlasLeafCount * TLAS_SIZE;
    let blasLeafOffset = blasLeafBase;
    const geomBVHOffsets = geometries.map((geometry) => {
      const geomBVH = geometry.getBVH();
      const bvhStartOffset = bvhOffset;
      bvhOffset = fillBVH(
        geomBVH.root,
        output,
        bvhOffset,
        (node) => blasLeafOffset + node.offset * BLAS_SIZE,
      );
      blasLeafOffset += geomBVH.indices.length * BLAS_SIZE;
      return bvhStartOffset;
    });
    const childInjectorOffset =
      bvhNodeCount * BVH_SIZE +
      tlasLeafCount * TLAS_SIZE +
      blasLeafCount * BLAS_SIZE;
    // Fill in TLAS data. The original BVH structure only moves around indices
    // array to preserve 'ID's of the objects, however this is not necessary
    // since we're just recopying everything - we can just reshuffle the output
    // data here.
    let tlasLeafOffset = tlasLeafBase;
    rootBVH.indices.forEach((index) => {
      const [entity] = children[index];
      const geomId = childrenGeomIds[index];
      const transform = entity.get<Transform>('transform')!;
      const matrix = transform.getMatrixWorld();
      const invMatrix = transform.getMatrixInverseWorld();

      const addr = tlasLeafOffset * 4;
      // |  min.x  |  min.y  |  min.z  | childId |
      // |  max.x  |  max.y  |  max.z  | blasAddr|
      // |  mat                                  |
      // |                                       |
      // |                                       |
      // |                                       |
      // |  invMat                               |
      // |                                       |
      // |                                       |
      // |                                       |
      // min, max
      for (let i = 0; i < 3; i += 1) {
        output[addr + i] = rootBVH.bounds[index * 6 + i];
        output[addr + 4 + i] = rootBVH.bounds[index * 6 + 3 + i];
      }
      output[addr + 3] =
        childInjectorResult.getOffset(index, childInjectorOffset);
      // blasAddr
      output[addr + 7] = geomBVHOffsets[geomId];
      for (let i = 0; i < 16; i += 1) {
        output[addr + 8 + i] = matrix[i];
      }
      for (let i = 0; i < 16; i += 1) {
        output[addr + 24 + i] = invMatrix[i];
      }
      tlasLeafOffset += TLAS_SIZE;
    });
    // Fill in BLAS data. Note that we don't put AABB data in here.
    blasLeafOffset = blasLeafBase;
    geometries.forEach((geometry) => {
      // |  v1.position  |    v1id   |
      // |  v2.position  |    v2id   |
      // |  v3.position  |    v3id   |
      // |  v1.normal    |   faceId  |
      // |  v2.normal    | tangent.x |
      // |  v3.normal    | tangent.y |
      // | v1.texCoord | v2.texCoord |
      // | v3.texCoord | tangent.zw  |
      const geomBVH = geometry.getBVH();
      const positions = geometry.options.attributes.aPosition!.data!;
      const normals = geometry.options.attributes.aNormal?.data;
      const texCoords = geometry.options.attributes.aTexCoord?.data;
      const tangents = geometry.options.attributes.aTangent?.data;
      const indices = geometry.options.indices!;
      geomBVH.indices.forEach((faceId) => {
        const addr = blasLeafOffset * 4;
        const v1Id = indices[faceId * 3];
        const v2Id = indices[faceId * 3 + 1];
        const v3Id = indices[faceId * 3 + 2];
        // ids
        output[addr + 3] = v1Id;
        output[addr + 7] = v2Id;
        output[addr + 11] = v3Id;
        output[addr + 15] = faceId;
        // positions
        for (let i = 0; i < 3; i += 1) {
          output[addr + i] = positions[v1Id * 3 + i];
          output[addr + 4 + i] = positions[v2Id * 3 + i];
          output[addr + 8 + i] = positions[v3Id * 3 + i];
        }
        // normals
        if (normals != null) {
          for (let i = 0; i < 3; i += 1) {
            output[addr + 12 + i] = normals[v1Id * 3 + i];
            output[addr + 16 + i] = normals[v2Id * 3 + i];
            output[addr + 20 + i] = normals[v3Id * 3 + i];
          }
        }
        // texCoords
        if (texCoords != null) {
          output[addr + 24] = texCoords[v1Id * 2];
          output[addr + 25] = texCoords[v1Id * 2 + 1];
          output[addr + 26] = texCoords[v2Id * 2];
          output[addr + 27] = texCoords[v2Id * 2 + 1];
          output[addr + 28] = texCoords[v3Id * 2];
          output[addr + 29] = texCoords[v3Id * 2 + 1];
        }
        // tangents. Since we know tangent is somewhat same for each face,
        // we can just probe v1.
        if (tangents != null) {
          output[addr + 19] = tangents[v1Id * 4];
          output[addr + 23] = tangents[v1Id * 4 + 1];
          output[addr + 30] = tangents[v1Id * 4 + 2];
          output[addr + 31] = tangents[v1Id * 4 + 3];
        }
        blasLeafOffset += BLAS_SIZE;
      });
    });
    // Write child injector result at the end of array
    childInjectorResult.write(output, childInjectorOffset);
    // Everything is generated at this point. Now, upload the buffer to GPU.
    this.bvhBuffer = output;
    this.bvhTexture.setOptions({
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      format: 'rgba',
      type: 'float',
      width,
      height,
      mipmap: false,
      source: output,
    });
  }
}

export function fillBVH(
  node: BVHNode,
  output: Float32Array,
  initialOffset: number,
  resolveLeafOffset: (node: BVHLeafNode) => number,
): number {
  let offset = initialOffset;
  function step(node: BVHNode): number {
    // |  min.x  |  min.y  |  min.z  |  left  |
    // |  max.x  |  max.y  |  max.z  | right  |
    const nodeOffset = offset;
    const nodeAddr = nodeOffset * 4;
    for (let i = 0; i < 3; i += 1) {
      output[nodeAddr + i] = node.bounds[i];
      output[nodeAddr + 4 + i] = node.bounds[3 + i];
    }
    offset += BVH_SIZE;
    if (node.isLeaf) {
      output[nodeAddr + 3] = -resolveLeafOffset(node);
      output[nodeAddr + 7] = node.length;
    } else {
      const leftOffset = step(node.left);
      const rightOffset = step(node.right);
      output[nodeAddr + 3] = leftOffset;
      output[nodeAddr + 7] = rightOffset;
    }
    return nodeOffset;
  }
  step(node);
  return offset;
}
