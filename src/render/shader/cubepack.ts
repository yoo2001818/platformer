export const CUBE_PACK = /* glsl */`
  #extension GL_EXT_shader_texture_lod : enable

  vec2 cubePackLookup(vec3 dir, float lod, vec2 texelSize) {
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
    return uv;
  }

  vec4 textureCubePackLodInt(sampler2D smp, vec3 dir, float lod, vec2 texelSize) {
    vec2 uv = cubePackLookup(dir, lod, texelSize);
    return texture2DLodEXT(smp, uv, 0.0);
  }

  vec4 textureCubePackLod(sampler2D smp, vec3 dir, float lod, vec2 texelSize) {
    float lodMin = floor(lod);
    float lodMax = lodMin + 1.0;
    vec4 resMin = textureCubePackLodInt(smp, dir, lodMin, texelSize);
    vec4 resMax = textureCubePackLodInt(smp, dir, lodMax, texelSize);
    return mix(resMin, resMax, fract(lod));
  }

  vec3 textureCubePackLodIntHDR(sampler2D smp, vec3 dir, float lod, vec2 texelSize) {
    vec2 uv = cubePackLookup(dir, lod, texelSize);

    #if defined(HDR_MANUAL_BILINEAR)
      // We can't use GPU's internal bilinear filtering in this case...
      // Instead, we snap to nearest texel and retrieve it.
      vec2 lowUV = (floor(uv * (1.0 / texelSize) - 0.5)) * texelSize;
      vec2 highUV = lowUV + texelSize;
      vec2 factor = fract(uv * (1.0 / texelSize) - 0.5);

      vec3 llPixel = unpackHDR(texture2DLodEXT(smp, lowUV, 0.0));
      vec3 hhPixel = unpackHDR(texture2DLodEXT(smp, highUV, 0.0));
      vec3 hlPixel = unpackHDR(texture2DLodEXT(smp, vec2(highUV.x, lowUV.y), 0.0));
      vec3 lhPixel = unpackHDR(texture2DLodEXT(smp, vec2(lowUV.x, highUV.y), 0.0));

      vec3 xlPixel = mix(llPixel, hlPixel, factor.x);
      vec3 xhPixel = mix(lhPixel, hhPixel, factor.x);
      vec3 pixel = mix(xlPixel, xhPixel, factor.y);
      return pixel;
    #else
      return unpackHDR(texture2DLodEXT(smp, uv, 0.0));
    #endif

  }

  vec3 textureCubePackLodHDR(sampler2D smp, vec3 dir, float lod, vec2 texelSize) {
    float lodMin = floor(lod);
    float lodMax = lodMin + 1.0;
    vec3 resMin = textureCubePackLodIntHDR(smp, dir, lodMin, texelSize);
    vec3 resMax = textureCubePackLodIntHDR(smp, dir, lodMax, texelSize);
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
    return vec4(blockPos, face, mipLevel);
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
