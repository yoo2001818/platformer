export function convertShaderToWebGL2(
  code: string,
  isFragment: boolean,
): string {
  const result = code.split('\n').map((line) => {
    let out = line;
    if (/#version/.exec(out)) {
      return '';
    }
    out = out.replace('attribute', 'in');
    out = out.replace('varying', isFragment ? 'in' : 'out');
    out = out.replace(
      /#extension.+(GL_OES_standard_derivatives|GL_EXT_shader_texture_lod|GL_EXT_frag_depth|GL_EXT_draw_buffers).+(enable|require)/g,
      '',
    );
    out = out.replace(/texture2DLodEXT\s*\(/g, 'textureLod(');
    out = out.replace(/textureCubeLodEXT\s*\(/g, 'textureLod(');
    out = out.replace(/texture2D\s*\(/g, 'texture(');
    out = out.replace(/textureCube\s*\(/g, 'texture(');
    if (isFragment) {
      out = out.replace(/gl_FragColor/g, 'glFragColor');
      if (/void\s+main\s*\(/.exec(out)) {
        out = `layout(location = 0) out vec4 glFragColor;\n${out}`;
      }
    }
    return out;
  }).join('\n');
  return `#version 300 es
  #define WEBGL2
  ${result}`;
}
