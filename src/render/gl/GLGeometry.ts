import {GeometryAttribute} from '../geometry/types';

import {GLArrayBuffer} from './GLArrayBuffer';
import {GLBuffer} from './GLBuffer';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLShader} from './GLShader';
import {Renderer} from './Renderer';
import {ArrayBufferView, AttributeOptions, BufferValue} from './types';
import {ATTRIBUTE_TYPE_MAP, flattenBuffer, inferBufferType} from './utils';
import {mergeArrayBuffers} from './utils/mergeArrayBuffers';

function mapObject<TInput extends {[key: string]: unknown;}, TOutput>(
  input: TInput,
  map: <TKey extends keyof TInput>(value: TInput[TKey], key: TKey) => TOutput,
): {[key in keyof TInput]: TOutput} {
  const output: any = {};
  for (const key in input) {
    if (key in input) {
      output[key] = map(input[key], key);
    }
  }
  return output;
}

export interface GLGeometryOptions {
  attributes: {
    [key: string]:
      | BufferValue
      | GLArrayBuffer
      | AttributeOptions
      | GeometryAttribute;
  };
  indices?: BufferValue | GLElementArrayBuffer;
  mode?: number;
  size?: number;
  count?: number;
}

interface BakedGeometryOptions {
  attributes: {[key: string]: AttributeOptions;};
  indices?: GLElementArrayBuffer;
  mode: number;
  count: number;
  offset: number;
}

const TRIANGLES = 4;

export class GLGeometry {
  options!: BakedGeometryOptions;
  managedBuffers: GLBuffer[] = [];
  renderer: Renderer | null = null;

  constructor(options: GLGeometryOptions) {
    this.set(options);
  }

  set(options: GLGeometryOptions): void {
    // Try to extract all "value" types, and store them into GLBuffer.
    const buffer = new GLArrayBuffer();
    const bufferInserts: (ArrayBufferLike | ArrayBufferView)[] = [];
    let bufferPos = 0;
    let inferredSize = 0;
    this.options = {
      attributes: mapObject(options.attributes, (value): AttributeOptions => {
        if (value instanceof GLArrayBuffer) {
          return {buffer: value};
        }
        if ('buffer' in value) {
          return value as AttributeOptions;
        }
        let dataArr;
        if ('data' in value) {
          dataArr = value.data;
        } else {
          dataArr = value;
        }
        // Flatten the array..
        const array = flattenBuffer(dataArr);
        const type = inferBufferType(dataArr);
        // We have to create ArrayBuffer from it
        const offset = bufferPos;
        bufferInserts.push(array);
        bufferPos += array.byteLength;
        inferredSize = array.byteLength;
        return {
          buffer,
          type,
          offset,
        };
      }),
      indices: ((): GLElementArrayBuffer | undefined => {
        if (options.indices == null) {
          return undefined;
        }
        if (options.indices instanceof GLElementArrayBuffer) {
          if (options.indices.byteLength != null) {
            // TODO: this means triangles / byte
            inferredSize = options.indices.byteLength;
          }
          return options.indices;
        }
        const output = new GLElementArrayBuffer(options.indices);
        if (output.byteLength != null) {
          // TODO: this means triangles / byte
          inferredSize = output.byteLength;
        }
        return output;
      })(),
      mode: options.mode ?? TRIANGLES,
      offset: options.count ?? 0,
      count: options.size ?? inferredSize,
    };
    buffer.set(mergeArrayBuffers(bufferInserts));
  }

  bind(renderer: Renderer, shader: GLShader): void {
    const {options} = this;
    for (const key in options.attributes) {
      if (key in options.attributes) {
        shader.setAttribute(key, options.attributes[key]);
      }
    }
    if (options.indices != null) {
      options.indices.bind(renderer);
    }
    this.renderer = renderer;
  }

  dispose(): void {

  }

  draw(): void {
    const {options, renderer} = this;
    if (renderer == null) {
      throw new Error('GLGeometry is not bound');
    }
    const {gl} = renderer;
    const {indices, mode, offset, count} = options;
    if (indices != null) {
      gl.drawElements(
        mode,
        count,
        ATTRIBUTE_TYPE_MAP[indices.dataType!],
        offset,
      );
    } else {
      gl.drawArrays(
        mode,
        offset,
        count,
      );
    }
  }
}
