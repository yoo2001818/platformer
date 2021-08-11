export const CUBE_PACK = /* glsl */`
  #extension GL_EXT_shader_texture_lod : enable

  vec4 textureCubePackLodInt(sampler2D smp, vec3 dir, float lod, vec2 texelSize) {
    // Mipmap constraining
    float mipBounds = pow(2.0, -lod);
    float mipStart = 1.0 - mipBounds;
    // Get texel size corresponding with the mip size
    vec2 packSize = texelSize / mipBounds;
    vec2 boxSize = vec2(0.5, 0.25) - 2.0 * packSize;
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
    uv += 1.0 * packSize;
    uv = uv * mipBounds + mipStart;
    return texture2DLodEXT(smp, uv, 0.0);
  }

  vec4 textureCubePackLod(sampler2D smp, vec3 dir, float lod, vec2 texelSize) {
    float lodMin = floor(lod);
    float lodMax = lodMin + 1.0;
    vec4 resMin = textureCubePackLodInt(smp, dir, lodMin, texelSize);
    vec4 resMax = textureCubePackLodInt(smp, dir, lodMax, texelSize);
    return mix(resMin, resMax, fract(lod));
  }

  vec4 textureCubePackFaceLodInt(sampler2D smp, vec2 uv, float face, float lod) {
    // Mipmap constraining
    float mipBounds = pow(2.0, -lod);
    float mipStart = 1.0 - mipBounds;
    vec2 boxSize = vec2(0.5, 0.25);
    vec2 lookupUV = boxSize * (uv + vec2(mod(face, 2.0), floor(face / 2.0)));
    lookupUV = lookupUV * mipBounds + mipStart;
    return texture2DLodEXT(smp, lookupUV, 0.0);
  }

  vec4 cubePackReverseFace(vec2 uv) {
    // Retrieve mipmap level
    vec2 logPos = floor(-log2(1.0 - uv));
    float mipLevel = min(logPos.x, logPos.y);
    float mipBounds = pow(2.0, -mipLevel);
    float mipStart = 1.0 - mipBounds;
    vec2 mipPos = (uv - mipStart) / mipBounds;
    // Retrieve axis
    // Y
    // ^ Z- /
    // | Z+ /
    // | X- Y-
    // | X+ Y+
    // +------> X
    vec2 mipWorkPos = mipPos * vec2(2.0, 4.0);
    vec2 blockPos = fract(mipWorkPos);
    vec2 facePos = floor(mipWorkPos);
    float face = facePos.x + facePos.y * 2.0;
    return vec3(blockPos, face, mipLevel);
  }

  vec4 cubePackReverseLookup(vec2 uv, vec2 texelSize) {
    // Retrieve mipmap level
    vec2 logPos = floor(-log2(1.0 - uv));
    float mipLevel = min(logPos.x, logPos.y);
    float mipBounds = pow(2.0, -mipLevel);
    float mipStart = 1.0 - mipBounds;
    vec2 mipPos = (uv - mipStart) / mipBounds;
    // Retrieve axis
    // Y
    // ^ Z- /
    // | Z+ /
    // | X- Y-
    // | X+ Y+
    // +------> X
    vec2 blockPos = fract(mipPos * vec2(2.0, 4.0)) * 2.0 - 1.0;
    vec2 packSize = texelSize * vec2(2.0, 4.0) / mipBounds;
    // Calculate underscan factor
    blockPos /= max(1.0 - (2.0 * packSize), 0.0002);
    vec3 front;
    vec3 up;
    vec3 right;
    if (mipPos.y >= 0.5) {
      front = vec3(0.0, 0.0, 1.0);
      up = vec3(0.0, 1.0, 0.0);
    } else if (mipPos.x <= 0.5) {
      front = vec3(1.0, 0.0, 0.0);
      up = vec3(0.0, 1.0, 0.0);
    } else {
      front = vec3(0.0, 1.0, 0.0);
      up = vec3(0.0, 0.0, 1.0);
    }
    if (mod(mipPos.y, 0.5) >= 0.25) {
      front = front * -1.0;
      up = up * vec3(1.0, 1.0, -1.0);
    }
    right = cross(front, up);
    vec3 coord = front + up * blockPos.y + right * blockPos.x;
    return vec4(coord, mipLevel);
  }
`;
