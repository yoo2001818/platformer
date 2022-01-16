export const POINT_LIGHT = /* glsl */`
  struct PointLight {
    vec3 position;
    vec3 color;
    vec3 intensity;
  };

  vec3 calcPointLight(
    out vec3 L,
    vec3 V,
    vec3 N,
    vec3 hitPos,
    PointLight light
  ) {
    float radius = light.intensity.y;
    L = light.position - hitPos;

    vec3 R = reflect(V, N);
    vec3 centerToRay = dot(L, R) * R - L;
    vec3 closestPos = L +
      centerToRay * clamp(radius / length(centerToRay), 0.0, 1.0);
    L = closestPos;

    float lightDist = length(L);
    L = L / lightDist;

    float power = light.intensity.x;
    float range = light.intensity.z;
    float attenuation = power / (0.0001 + (lightDist * lightDist));
    float window = 1.0;
    if (range > 0.0) {
      window = pow(max(1.0 - pow(lightDist / range, 4.0), 0.0), 2.0);
    }
    
    float dotNL = max(dot(N, L), 0.0);

    return window * attenuation * dotNL * light.color;
  }
`;

export const POINT_LIGHT_RAYTRACE = /* glsl */`
  vec3 shootPointLight(
    vec3 hitPos,
    PointLight light,
    vec3 randVec3Val
  ) {
    vec3 L = light.position - hitPos;
    L += sampleSphere(randVec3Val) * light.intensity.y;
    return L;
  }
`;

export const DIRECTIONAL_LIGHT = /* glsl */`
  struct DirectionalLight {
    vec4 direction;
    vec3 color;
  };

  vec3 calcDirectionalLight(
    out vec3 L,
    vec3 V,
    vec3 N,
    vec3 hitPos,
    DirectionalLight light
  ) {
    L = normalize(light.direction.xyz);
    float dotNL = max(dot(N, L), 0.0);
    return light.direction.w * dotNL * light.color;
  }
`;

export const DIRECTIONAL_LIGHT_RAYTRACE = /* glsl */`
  vec3 shootDirectionalLight(
    vec3 hitPos,
    DirectionalLight light
  ) {
    vec3 L = light.direction.xyz;
    return L;
  }
`;

export const ENVIRONMENT_MAP = /* glsl */`
  vec3 calcEnvironmentMap(vec3 viewPos, MaterialInfo mInfo, sampler2D brdfMap, sampler2D envMap, vec2 mapSize, float power) {
    vec3 albedo = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
    vec3 fresnel = mix(vec3(0.04), mInfo.albedo, mInfo.metalic);
    float roughness = mInfo.roughness;

    vec3 V = normalize(viewPos - mInfo.position);
    vec3 N = mInfo.normal;
    vec3 R = reflect(-V, N);
    float dotNV = max(dot(N, V), 0.0);
    float lodMax = floor(log2(0.5 / mapSize.x) - 3.0);
    // This tries to take advantage of mipmap when zooming out
    #ifdef FORWARD
      #ifdef GL_OES_standard_derivatives
      vec3 lodDiff = max(abs(dFdx(R)), abs(dFdy(R)));
      float lodTarget = log2(max(lodDiff.x, max(lodDiff.y, lodDiff.z)) / 90.0 / (mapSize.x * 0.5) + 1.0);
      float lod = max(roughness * (lodMax - 1.0), lodTarget);
      #elif defined(WEBGL2)
      vec3 lodDiff = max(abs(dFdx(R)), abs(dFdy(R)));
      float lodTarget = log2(max(lodDiff.x, max(lodDiff.y, lodDiff.z)) / 90.0 / (mapSize.x * 0.5) + 1.0);
      float lod = max(roughness * (lodMax - 1.0), lodTarget);
      #else
      float lod = roughness * (lodMax - 1.0);
      #endif
    #else
    float lod = roughness * (lodMax - 1.0);
    #endif
    vec3 envColor = textureCubePackLodHDR(envMap, R, lod, mapSize) * power;
    vec3 F = fresnelSchlickRoughness(dotNV, fresnel, roughness * roughness);
    vec2 envBRDF = texture2D(brdfMap, vec2(dotNV, roughness)).rg;

    vec3 spec = envColor * (F * envBRDF.x + envBRDF.y);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;

    vec3 irradiance = textureCubePackLodHDR(envMap, N, lodMax, mapSize) * power;

    return kD * albedo * irradiance + spec;
  }
`;

export const PROBE_GRID_LIGHT = /* glsl */`
  struct ProbeGridLight {
    mat4 matrix;
    mat4 invMatrix;
    vec3 size;
    float power;
    float range;
  };

  float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec3 calcProbeGridLight(vec3 viewPos, MaterialInfo mInfo, sampler2D gridMap, ProbeGridLight light) {
    vec3 invLightSize = 1.0 / light.size;
    // Note that we can only use irradiance here
    // First, get the probe position...
    vec3 pos = (light.invMatrix * vec4(mInfo.position, 1.0)).xyz;
    // Move the probe from -1 ~ 1 to 0 ~ 1
    pos = (pos + 1.0) * 0.5;
    // The probe is at the center of the screen; rescale to fit the actual
    // probe position
    pos = (pos - invLightSize * 0.5) / (1.0 - invLightSize);
    pos = clamp(pos, vec3(0.0), vec3(1.0));
    pos *= (light.size - 1.0);
    // Run trilinear filtering according to the position. This should be
    // done in TMU, otherwise we have to run 81 texel lookups (9 * 8),
    // however, if TMU does it, we can only lookup 18 (9 * 2).
    // 
    // The probe texture structure is a series of XZ map, however we don't use
    // 3D texture or texture arrays because it requires WebGL 2. Since this
    // routine should be able to run in WebGL 1, we omit 3D textures.
    // The probe texture is split to X and Y grid of XZ map.
    // X axis should mean 9 values of the spherical harmonics.
    // Y axis should mean Y value.

    // (p / s * (s - 1) + 0.5) / s
    vec2 offsetPos = (pos.xz * invLightSize.xz * (light.size.xz - 1.0) + 0.5) * invLightSize.xz;
    offsetPos *= vec2(1.0 / 9.0, invLightSize.y);
    float bottomY = floor(pos.y) * invLightSize.y;
    float topY = ceil(pos.y) * invLightSize.y;
    float yOffset = fract(pos.y);
    vec3[9] sh;
    for (int i = 0; i < 9; i += 1) {
      vec2 bottomPos = vec2(float(i) / 9.0, bottomY * invLightSize.y) + offsetPos;
      vec2 topPos = vec2(float(i) / 9.0, topY * invLightSize.y) + offsetPos;
      vec4 bottomTexel = texture2D(gridMap, bottomPos);
      vec4 topTexel = texture2D(gridMap, topPos);
      vec3 bottomValue = bottomTexel.rgb / bottomTexel.a;
      vec3 topValue = topTexel.rgb / topTexel.a;
      sh[i] = mix(bottomValue, topValue, yOffset);
    }

    // We have SH data now; calculate irradiance
    return shEvaulateDiffuse(sh, mInfo.normal);
  }
`;
