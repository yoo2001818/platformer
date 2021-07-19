import {GeometryOptions, TRIANGLES} from '../geometry/types';

import {GLArrayBuffer} from './GLArrayBuffer';
import {GLBuffer} from './GLBuffer';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {Renderer} from './Renderer';
import {ArrayBufferView, AttributeOptions} from './types';
import {flattenBuffer, inferBufferType} from './utils';
import { mergeArrayBuffers } from './utils/mergeArrayBuffers';

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

interface BakedGeometryOptions {
  attributes?: {[key: string]: AttributeOptions;};
  indices?: GLElementArrayBuffer;
  mode: number;
  size: number;
  offset: number;
}

export class GLGeometry {
  options!: BakedGeometryOptions;
  managedBuffers: GLBuffer[] = [];
  renderer: Renderer | null = null;

  constructor(options: GeometryOptions) {
    this.set(options);
  }

  set(options: GeometryOptions): void {
    // Try to extract all "value" types, and store them into GLBuffer.
    const buffer = new GLArrayBuffer();
    const bufferInserts: (ArrayBufferLike | ArrayBufferView)[] = [];
    let bufferPos = 0;
    this.options = {
      attributes: mapObject(options.attributes, (value): AttributeOptions => {
        if (value instanceof GLArrayBuffer) {
          return {buffer: value};
        }
        if ('buffer' in value) {
          return value as AttributeOptions;
        }
        // Flatten the array..
        const array = flattenBuffer(value);
        const type = inferBufferType(value);
        // We have to create ArrayBuffer from it
        const offset = bufferPos;
        bufferInserts.push(array);
        bufferPos += array.byteLength;
        return {
          buffer,
          type,
          offset,
        };
      }),
      mode: TRIANGLES,
      offset: 0,
      size: 0,
    };
    buffer.set(mergeArrayBuffers(bufferInserts));
  }

  bind(renderer: Renderer): void {

  }

  dispose(): void {

  }
}
