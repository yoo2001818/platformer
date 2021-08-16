import {GeometryAttribute} from '../../geom/types';

import {GLArrayBuffer} from './GLArrayBuffer';
import {GLBuffer} from './GLBuffer';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLShader} from './GLShader';
import {GLRenderer} from './GLRenderer';
import {ArrayBufferView, AttributeOptions, BufferValue} from './types';
import {ATTRIBUTE_TYPE_MAP, flattenBuffer, inferBufferType, TYPE_LENGTHS} from './utils';
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
  renderer: GLRenderer | null = null;

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
        inferredSize = array.byteLength / TYPE_LENGTHS[type];
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
            inferredSize = options.indices.length;
          }
          return options.indices;
        }
        const output = new GLElementArrayBuffer(options.indices);
        if (output.byteLength != null) {
          inferredSize = output.length;
        }
        return output;
      })(),
      mode: options.mode ?? TRIANGLES,
      offset: options.count ?? 0,
      count: options.size ?? inferredSize,
    };
    buffer.set(mergeArrayBuffers(bufferInserts));
  }

  bind(renderer: GLRenderer, shader: GLShader): void {
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

  drawInstanced(primCount: number): void {
    const {options, renderer} = this;
    if (renderer == null) {
      throw new Error('GLGeometry is not bound');
    }
    const {capabilities} = renderer;
    const {instanceExt} = capabilities;
    const {indices, mode, offset, count} = options;
    if (capabilities.isWebGL2) {
      const gl2 = renderer.gl as WebGL2RenderingContext;
      if (indices != null) {
        gl2.drawElementsInstanced(
          mode,
          count,
          ATTRIBUTE_TYPE_MAP[indices.dataType!],
          offset,
          primCount,
        );
      } else {
        gl2.drawArraysInstanced(
          mode,
          offset,
          count,
          primCount,
        );
      }
    } else if (instanceExt != null) {
      if (indices != null) {
        instanceExt.drawElementsInstancedANGLE(
          mode,
          count,
          ATTRIBUTE_TYPE_MAP[indices.dataType!],
          offset,
          primCount,
        );
      } else {
        instanceExt.drawArraysInstancedANGLE(
          mode,
          offset,
          count,
          primCount,
        );
      }
    } else {
      throw new Error('instancing extension is required');
    }
  }
}
