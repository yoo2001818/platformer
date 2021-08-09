export const CUBE_PACK = /* glsl */`
  #extension GL_EXT_shader_texture_lod : enable
  const vec2 cubePackSize = vec2(1.0 / 1024.0, 1.0 / 2048.0);

  vec4 textureCubePackLodInt(sampler2D smp, vec3 dir, float lod) {
    // Mipmap constraining
    float mipBounds = pow(2.0, -lod);
    float mipStart = 1.0 - mipBounds;
    // Get texel size corresponding with the mip size
    vec2 packSize = cubePackSize / mipBounds;
    vec2 boxSize = vec2(0.5, 0.25) - 1.0 * packSize;
    // Get texture bounds
    vec2 uv;
    vec3 absDir = abs(dir);
    // Y
    // ^ Z- /
    // | Z+ /
    // | X- Y-
    // | X+ Y+
    // +------> X
    if (absDir.x > absDir.z && absDir.x > absDir.y) {
      // X+ or X- is selected
      if (dir.x > 0.0) {
        uv = vec2(dir.z, dir.y) / absDir.x;
        uv = (uv * 0.5 + 0.5) * boxSize;
      } else {
        uv = vec2(-dir.z, dir.y) / absDir.x;
        uv = (uv * 0.5 + 0.5) * boxSize;
        uv += vec2(0.0, 0.25);
      }
    } else if (absDir.y > absDir.x && absDir.y > absDir.z) {
      // Y+ or Y- is selected
      if (dir.y > 0.0) {
        uv = vec2(dir.x, dir.z) / absDir.y;
        uv = (uv * 0.5 + 0.5) * boxSize;
        uv += vec2(0.5, 0.0);
      } else {
        uv = vec2(dir.x, -dir.z) / absDir.y;
        uv = (uv * 0.5 + 0.5) * boxSize;
        uv += vec2(0.5, 0.25);
      }
    } else {
      // Z+ or Z- is selected
      if (dir.z > 0.0) {
        uv = vec2(-dir.x, dir.y) / absDir.z;
        uv = (uv * 0.5 + 0.5) * boxSize;
        uv += vec2(0.0, 0.5);
      } else {
        uv = vec2(dir.x, dir.y) / absDir.z;
        uv = (uv * 0.5 + 0.5) * boxSize;
        uv += vec2(0.0, 0.75);
      }
    }
    uv += 0.5 * packSize;
    uv = uv * mipBounds + mipStart;
    return texture2DLodEXT(smp, uv, 0.0);
  }

  vec4 textureCubePackLod(sampler2D smp, vec3 dir, float lod) {
    float lodMin = floor(lod);
    float lodMax = lodMin + 1.0;
    vec4 resMin = textureCubePackLodInt(smp, dir, lodMin);
    vec4 resMax = textureCubePackLodInt(smp, dir, lodMax);
    return mix(resMin, resMax, fract(lod));
  }
`;
