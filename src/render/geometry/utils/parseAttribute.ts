export function flattenBuffer(
  data: number[] | number[][] | Float32Array,
): Float32Array {
  if (data instanceof Float32Array) {
    return data;
  }
  if (Array.isArray(data[0])) {
    const axis = data[0].length;
    const output = new Float32Array(data.length * axis);
    for (let i = 0; i < data.length; i += 1) {
      const entry = data[i] as number[];
      for (let j = 0; j < axis; j += 1) {
        output[i * axis + j] = entry[j];
      }
    }
    return output;
  }
  return new Float32Array(data as number[]);
}

export function flattenBufferToArray(
  data: number[] | number[][] | Float32Array,
): number[] {
  if (data instanceof Float32Array) {
    return Array.from(data);
  }
  if (Array.isArray(data[0])) {
    const axis = data[0].length;
    const output: number[] = [];
    for (let i = 0; i < data.length; i += 1) {
      const entry = data[i] as number[];
      for (let j = 0; j < axis; j += 1) {
        output[i * axis + j] = entry[j];
      }
    }
    return output;
  }
  return data as number[];
}
