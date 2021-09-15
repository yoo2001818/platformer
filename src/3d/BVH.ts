import {GeometryOptions} from '../geom/types';

export interface BVHBaseNode {
  bounds: Float32Array;
  isLeaf: boolean;
}

export interface BVHBranchNode extends BVHBaseNode {
  isLeaf: false;
  left: BVHNode;
  right: BVHNode;
}

export interface BVHLeafNode extends BVHBaseNode {
  isLeaf: true;
  offset: number;
  length: number;
}

export type BVHNode = BVHBranchNode | BVHLeafNode;

const EPSILON = 0.000001;

export interface BVH {
  root: BVHNode;
  indices: Uint32Array;
  bounds: Float32Array;
  centers: Float32Array;
  depth: number;
  nodeCount: number;
}

export function calcBounds(
  output: Float32Array,
  node: BVHLeafNode,
  bvh: BVH,
): Float32Array {
  const {indices, bounds} = bvh;
  const {offset, length} = node;
  let initialized = false;
  for (let i = offset; i < offset + length; i += 1) {
    const addr = indices[i] * 6;
    if (initialized) {
      for (let j = 0; j < 3; j += 1) {
        output[j] = Math.min(output[j], bounds[addr + j] - EPSILON);
      }
      for (let j = 3; j < 6; j += 1) {
        output[j] = Math.max(output[j], bounds[addr + j] + EPSILON);
      }
    } else {
      for (let j = 0; j < 3; j += 1) {
        output[j] = bounds[addr + j] - EPSILON;
      }
      for (let j = 3; j < 6; j += 1) {
        output[j] = bounds[addr + j] + EPSILON;
      }
      initialized = true;
    }
  }
  return output;
}

export function calcBoundsUnion(
  b0: Float32Array | null,
  b1: Float32Array,
  b1Addr = 0,
): Float32Array {
  if (b0 == null) {
    const output = new Float32Array(6);
    for (let i = 0; i < 6; i += 1) {
      output[i] = b1[i + b1Addr];
    }
    return output;
  }
  for (let i = 0; i < 3; i += 1) {
    b0[i] = Math.min(b0[i], b1[i + b1Addr]);
    b0[i + 3] = Math.max(b0[i + 3], b1[i + 3 + b1Addr]);
  }
  return b0;
}

export function calcBoundsSurfaceArea(
  bounds: Float32Array | null,
  addr = 0,
): number {
  if (bounds == null) {
    return 0;
  }
  const x = bounds[addr + 3] - bounds[addr];
  const y = bounds[addr + 4] - bounds[addr + 1];
  const z = bounds[addr + 5] - bounds[addr + 2];
  return 2 * (x * y + x * z + y * z);
}

export function calcCenters(bounds: Float32Array): Float32Array {
  const length = (bounds.length / 6) | 0;
  const centers = new Float32Array(length * 3);
  for (let i = 0; i < length; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      centers[i * 3 + j] = (bounds[i * 6 + j] + bounds[i * 6 + 3 + j]) / 2;
    }
  }
  return centers;
}

export function splitBVHAxisSAH(
  node: BVHLeafNode,
  bvh: BVH,
  workBuffer: Uint32Array,
  workBufferAddr: number,
  axis: number,
): [number, number] {
  const {indices, centers, bounds} = bvh;
  const {offset, length} = node;
  const bucketSize = 12;
  const buckets: {count: number; bounds: Float32Array | null;}[] = [];
  for (let i = 0; i < bucketSize; i += 1) {
    buckets[i] = {count: 0, bounds: null};
  }
  // Allocate buckets
  const nodeMin = node.bounds[axis];
  const nodeMax = node.bounds[axis + 3];
  for (let i = offset; i < offset + length; i += 1) {
    const index = indices[i];
    const percentage =
      (centers[index * 3 + axis] - nodeMin) / (nodeMax - nodeMin);
    const target = Math.round(percentage * (bucketSize - 1));
    const bucket = buckets[target];
    bucket.count += 1;
    bucket.bounds = calcBoundsUnion(bucket.bounds, bounds, index * 6);
  }
  // Compute cost for each buckets
  const costs: number[] = [];
  for (let i = 0; i < bucketSize - 1; i += 1) {
    let b0: Float32Array | null = null;
    let b1: Float32Array | null = null;
    let count0 = 0;
    let count1 = 0;
    buckets.slice(0, i + 1).forEach((bucket) => {
      if (bucket.bounds == null) {
        return;
      }
      b0 = calcBoundsUnion(b0, bucket.bounds);
      count0 += bucket.count;
    });
    buckets.slice(i + 1).forEach((bucket) => {
      if (bucket.bounds == null) {
        return;
      }
      b1 = calcBoundsUnion(b1, bucket.bounds);
      count1 += bucket.count;
    });
    costs[i] = 0.125 + (
      count0 * calcBoundsSurfaceArea(b0) +
      count1 * calcBoundsSurfaceArea(b1)) /
      calcBoundsSurfaceArea(node.bounds);
  }
  // Find the minimal bucket
  let minCost = costs[0];
  let minCostIndex = 0;
  for (let i = 1; i < bucketSize - 1; i += 1) {
    if (minCost > costs[i]) {
      minCost = costs[i];
      minCostIndex = i;
    }
  }
  // Finally, partition them
  let leftPos = workBufferAddr;
  let rightPos = workBufferAddr + length - 1;
  for (let i = offset; i < offset + length; i += 1) {
    const index = indices[i];
    const percentage =
      (centers[index * 3 + axis] - nodeMin) / (nodeMax - nodeMin);
    const target = Math.round(percentage * (bucketSize - 1));
    if (target > minCostIndex) {
      // right
      workBuffer[rightPos] = index;
      rightPos -= 1;
    } else {
      // left
      workBuffer[leftPos] = index;
      leftPos += 1;
    }
  }
  return [
    leftPos - workBufferAddr,
    workBufferAddr + length - 1 - rightPos,
  ];
}

export function splitBVHAxisCenter(
  node: BVHLeafNode,
  bvh: BVH,
  workBuffer: Uint32Array,
  workBufferAddr: number,
  axis: number,
): [number, number] {
  // https://github.com/benraziel/bvh-tree
  const {indices, centers} = bvh;
  const {offset, length} = node;
  // center method
  const center = calcCenters(node.bounds);
  // Try to separate by each axis.
  let leftPos = workBufferAddr;
  let rightPos = workBufferAddr + length - 1;
  for (let i = offset; i < offset + length; i += 1) {
    const index = indices[i];
    if (centers[index * 3 + axis] > center[axis]) {
      // right
      workBuffer[rightPos] = index;
      rightPos -= 1;
    } else {
      // left
      workBuffer[leftPos] = index;
      leftPos += 1;
    }
  }
  return [
    leftPos - workBufferAddr,
    workBufferAddr + length - 1 - rightPos,
  ];
}

export function splitBVHAxisAverage(
  node: BVHLeafNode,
  bvh: BVH,
  workBuffer: Uint32Array,
  workBufferAddr: number,
  axis: number,
): [number, number] {
  // https://github.com/benraziel/bvh-tree
  const {indices, centers} = bvh;
  const {offset, length} = node;
  const center = new Float32Array(3);
  for (let i = offset; i < offset + length; i += 1) {
    const index = indices[i];
    for (let j = 0; j < 3; j += 1) {
      center[j] += centers[index * 3 + j];
    }
  }
  for (let j = 0; j < 3; j += 1) {
    center[j] /= length;
  }
  // Try to separate by each axis.
  let leftPos = workBufferAddr;
  let rightPos = workBufferAddr + length - 1;
  for (let i = offset; i < offset + length; i += 1) {
    const index = indices[i];
    if (centers[index * 3 + axis] > center[axis]) {
      // right
      workBuffer[rightPos] = index;
      rightPos -= 1;
    } else {
      // left
      workBuffer[leftPos] = index;
      leftPos += 1;
    }
  }
  return [
    leftPos - workBufferAddr,
    workBufferAddr + length - 1 - rightPos,
  ];
}

export function splitBVH(
  node: BVHLeafNode,
  bvh: BVH,
  workBuffer: Uint32Array,
  depth = 0,
): BVHNode {
  if (node.length < 4) {
    return node;
  }
  // https://github.com/benraziel/bvh-tree
  const {indices} = bvh;
  const {offset, length} = node;
  // Try to separate by each axis.
  const lengths: [number, number][] = [];
  for (let axis = 0; axis < 3; axis += 1) {
    lengths[axis] = splitBVHAxisSAH(
      node, bvh, workBuffer, axis * length, axis,
    );
  }
  // Determine the best axis
  let bestAxis = 0;
  let bestScore = 0;
  for (let axis = 0; axis < 3; axis += 1) {
    const leftLength = lengths[axis][0];
    const rightLength = lengths[axis][1];
    const score = Math.abs(leftLength - rightLength);
    if (score < bestScore || axis === 0) {
      bestAxis = axis;
      bestScore = score;
    }
  }
  const leftLength = lengths[bestAxis][0];
  const rightLength = lengths[bestAxis][1];
  if (leftLength === 0 || rightLength === 0) {
    // Do nothing if separation results in no-op
    return node;
  }
  // Create left / right node and fill data in
  // NOTE: This FLIPS the data of the right BVH node. However this is completely
  // fine as the BVH node doesn't care about that.
  const workOffset = bestAxis * length;
  indices.set(workBuffer.subarray(workOffset, workOffset + length), offset);
  let left: BVHNode = {
    bounds: new Float32Array(6),
    isLeaf: true,
    offset,
    length: leftLength,
  };
  let right: BVHNode = {
    bounds: new Float32Array(6),
    isLeaf: true,
    offset: offset + leftLength,
    length: rightLength,
  };
  calcBounds(left.bounds, left, bvh);
  calcBounds(right.bounds, right, bvh);
  left = splitBVH(left, bvh, workBuffer, depth + 1);
  right = splitBVH(right, bvh, workBuffer, depth + 1);
  const newParent: BVHBranchNode = {
    bounds: node.bounds,
    isLeaf: false,
    left,
    right,
  };
  bvh.depth = Math.max(bvh.depth, depth + 1);
  bvh.nodeCount += 2;
  return newParent;
}

export function createBVH(bounds: Float32Array): BVH {
  // Create indices-filled uint32array
  const length = (bounds.length / 6) | 0;
  const indices = new Uint32Array(length);
  for (let i = 0; i < length; i += 1) {
    indices[i] = i;
  }
  const root: BVHLeafNode = {
    bounds: new Float32Array(6),
    isLeaf: true,
    offset: 0,
    length,
  };
  const bvh: BVH = {
    root,
    bounds,
    indices,
    centers: calcCenters(bounds),
    depth: 1,
    nodeCount: 1,
  };
  calcBounds(root.bounds, root, bvh);
  bvh.root = splitBVH(root, bvh, new Uint32Array(length * 3));
  return bvh;
}

export function createBVHFromGeometry(geometry: GeometryOptions): BVH {
  const vertices = geometry.attributes.aPosition?.data;
  if (vertices == null) {
    throw new Error('aPosition must be specified');
  }
  const indices = geometry.indices;
  if (indices == null) {
    throw new Error('Indices must be specified');
  }
  const length = (indices.length / 3) | 0;
  const bounds = new Float32Array(length * 6);
  for (let faceId = 0; faceId < length; faceId += 1) {
    for (let triId = 0; triId < 3; triId += 1) {
      const id = indices[faceId * 3 + triId];
      if (triId === 0) {
        for (let i = 0; i < 3; i += 1) {
          bounds[faceId * 6 + i] = vertices[id * 3 + i];
          bounds[faceId * 6 + 3 + i] = vertices[id * 3 + i];
        }
      } else {
        for (let i = 0; i < 3; i += 1) {
          bounds[faceId * 6 + i] = Math.min(
            vertices[id * 3 + i],
            bounds[faceId * 6 + i],
          );
          bounds[faceId * 6 + 3 + i] = Math.max(
            vertices[id * 3 + i],
            bounds[faceId * 6 + 3 + i],
          );
        }
      }
    }
  }
  return createBVH(bounds);
}
