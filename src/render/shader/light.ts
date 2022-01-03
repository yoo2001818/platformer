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
    ivec3 size;
    float power;
    float range;
  };

  vec3 calcProbeGridLight(vec3 viewPos, MaterialInfo mInfo, sampler2D gridMap, ProbeGridLight light) {
    // Note that we can only use irradiance here
    return vec3(1.0, 0.0, 0.0);
  }
`;
