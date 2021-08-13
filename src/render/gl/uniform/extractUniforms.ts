import {UniformEntry, UniformResult, UniformSlot} from './types';
import {isUniformType} from './utils';

function getUniformPath(name: string): (string | number)[] {
  // Parse uniform name. The uniform name is separated using [] and .
  // For example: abc.def[1].g
  // abc .def [1] .g
  // first = \s
  // keyword = '.' \s
  // list = '[' \d ']'
  // attr = keyword | list
  // name = first attr+
  //
  // Considering this in mind, we can build a parser like...
  const regex = /(?:^|\.)(\w+)|\[(\d+)\]/g;
  // This way, we can convert the name to list of tokens.
  let match;
  const tokens: (string | number)[] = [];
  // eslint-disable-next-line no-cond-assign
  while (match = regex.exec(name)) {
    if (match[1] != null) {
      tokens.push(match[1]);
    } else if (match[2] != null) {
      tokens.push(parseInt(match[2], 10));
    }
  }
  return tokens;
}

export function addUniform(
  tokens: (string | number)[],
  type: UniformSlot,
  output: {[key: string]: UniformEntry;},
): void {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  let current: Record<any, UniformEntry> = output;
  // Using the tokens, we recursively step into the given value...
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    // Assert the map to have same type as the token. This would require
    // generics, so we'll just forcefully convert them to strings for now
    // Create next token store
    const nextToken = tokens[i + 1];
    const nextEntry: UniformEntry = current[token];
    if (nextEntry == null) {
      const newEntry = typeof nextToken === 'number' ? [] : {};
      current[token] = newEntry;
      current = newEntry;
    } else if (isUniformType(nextEntry)) {
      throw new Error('Invalid uniform');
    } else {
      current = nextEntry as unknown as any;
    }
  }
  // Set the final value
  current[tokens[tokens.length - 1]] = type;
}

export function extractUniforms(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
): UniformResult {
  const output: {[key: string]: UniformEntry;} = {};
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < numUniforms; i += 1) {
    const uniform = gl.getActiveUniform(program, i)!;
    if (uniform.size > 1) {
      // An array has been received; in this case WebGL only offers single
      // position ([0]). We map each array value to an uniform.
      for (let j = 0; j < uniform.size; j += 1) {
        const newName = `${uniform.name.slice(0, -3)}[${j}]`;
        const path = getUniformPath(newName);
        addUniform(path, {
          location: gl.getUniformLocation(program, newName)!,
          name: newName,
          path,
          size: 1,
          type: uniform.type,
          uniform: 'uniform',
        }, output);
      }
    } else {
      const loc = gl.getUniformLocation(program, uniform.name)!;
      const path = getUniformPath(uniform.name);
      addUniform(path, {
        location: loc,
        name: uniform.name,
        path,
        size: uniform.size,
        type: uniform.type,
        uniform: 'uniform',
      }, output);
    }
  }
  return { uniforms: output, textures: [] };
}
