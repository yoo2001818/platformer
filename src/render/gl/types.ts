export type ArrayBufferView =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | DataView;

export type BufferValue =
  | ArrayBufferLike
  | ArrayBufferView
  | number[]
  | number[][];
