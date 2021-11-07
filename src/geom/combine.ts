import {GeometryAttribute, GeometryOptions, TRIANGLES} from './types';

export function combine(inputs: GeometryOptions[]): GeometryOptions {
  const mode = inputs.reduce((prev: number | null, input): number => {
    const geomMode = input.mode ?? TRIANGLES;
    if (prev == null) {
      return geomMode;
    }
    if (prev !== geomMode) {
      throw new Error('Geometry can be only combined with the same mode');
    }
    return prev;
  }, null) ?? TRIANGLES;
  // We need to join every attributes, while generating indices.
  // First, calculate vertices count per geometry.
  const attributeSizes: {[key: string]: number;} = {};
  const vertexCounts = inputs.map((input) => {
    let vertexCount = -1;
    Object.keys(input.attributes).forEach((name) => {
      const attribute = input.attributes[name];
      const currentCount = attribute.data.length / attribute.size;
      if (vertexCount === -1) {
        vertexCount = currentCount;
      } else if (vertexCount !== currentCount) {
        throw new Error('Vertex count mismatch');
      }
      if (attributeSizes[name] == null) {
        attributeSizes[name] = attribute.size;
      } else if (attributeSizes[name] < attribute.size) {
        attributeSizes[name] = attribute.size;
      }
    });
    if (vertexCount === -1) {
      throw new Error('Geometry should have at least one attribute');
    }
    return vertexCount;
  });
  const vertexCount = vertexCounts.reduce((a, b) => a + b);
  const useIndices = inputs.some((a) => a.indices);
  // Pre-calculation is complete, populate actual data (per attribute)
  const attributes: {[key: string]: GeometryAttribute;} = {};
  Object.keys(attributeSizes).forEach((name) => {
    const size = attributeSizes[name];
    // TODO: Support other than Float32Array
    const data = new Float32Array(vertexCount * size);
    // Populate data
    let offset = 0;
    inputs.forEach((geometry, i) => {
      if (geometry.attributes[name]) {
        const geomAttribute = geometry.attributes[name];
        // Copy the whole data upon it (if axis matches)
        if (size === geomAttribute.size) {
          data.set(geomAttribute.data, offset);
        } else {
          // Otherwise, we have to copy it by one by one
          for (let j = 0; j < vertexCounts[i]; ++j) {
            const subset = geomAttribute.data.slice(j, j + geomAttribute.size);
            data.set(subset, offset + j * size);
          }
        }
      }
      offset += vertexCounts[i] * size;
    });
    attributes[name] = {size, data};
  });
  // Now, populate the indices
  let indices: number[] | undefined;
  if (useIndices) {
    const indicesOut: number[] = [];
    let indicesOffset = 0;
    let verticesOffset = 0;
    inputs.forEach((geometry, i) => {
      if (geometry.indices) {
        for (let j = 0; j < geometry.indices.length; ++j) {
          indicesOut[indicesOffset + j] = geometry.indices[j] + verticesOffset;
        }
      } else {
        for (let j = 0; j < vertexCounts[i]; ++j) {
          indicesOut[indicesOffset + j] = j + verticesOffset;
        }
      }
      indicesOffset += geometry.indices
        ? geometry.indices.length : vertexCounts[i];
      verticesOffset += vertexCounts[i];
    });
    indices = indicesOut;
  }
  return {
    mode, attributes, indices,
  };
}
