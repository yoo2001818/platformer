export function parseIndices(
  indices: number[] | number[][] | Uint8Array | Uint16Array | Uint32Array,
): Uint8Array | Uint16Array | Uint32Array {
  if (Array.isArray(indices)) {
    let output: number[] = [];
    if (Array.isArray(indices[0])) {
      // Flatten it.....
      // What the heck
      (indices as number[][])
        .forEach((v1) => v1.forEach((v2) => output.push(v2)));
    } else {
      output = indices as number[];
    }
    const valueMax = output.reduce((prev, cur) => Math.max(prev, cur), 0);
    if (valueMax < 256) {
      return new Uint8Array(output);
    }
    if (valueMax < 65536) {
      return new Uint16Array(output);
    }
    return new Uint32Array(output);
  }
  return indices;
}

export function parseIndicesNumber(
  indices: number[] | number[][] | Uint8Array | Uint16Array | Uint32Array,
): number[] {
  if (Array.isArray(indices)) {
    if (Array.isArray(indices[0])) {
      // Flatten it.....
      const output: number[] = [];
      // What the heck
      (indices as number[][])
        .forEach((v1) => v1.forEach((v2) => output.push(v2)));
      return output;
    }
    return indices as number[];
  }
  return Array.from(indices);
}
