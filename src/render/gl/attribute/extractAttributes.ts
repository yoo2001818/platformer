import {AttributeSlot} from './types';

export function extractAttributes(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
): {[key: string]: AttributeSlot;} {
  const output: {[key: string]: AttributeSlot;} = {};
  const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < numAttributes; i += 1) {
    const attribute = gl.getActiveAttrib(program, i)!;
    const location = gl.getAttribLocation(program, attribute.name);

    output[attribute.name] = {
      location,
      name: attribute.name,
      size: attribute.size,
      type: attribute.type,
    };
  }
  return output;
}
