export const RAYTRACE_STEP = /* glsl */`
  struct RaytraceContext {
    vec3 origin;
    vec3 dir;
    vec3 li;
    vec3 beta;
    float specDisabled;
    bool abort;
  };

  void initRaytraceContext(
    out RaytraceContext context,
    vec3 dir,
    vec3 origin
  ) {
    context.dir = dir;
    context.origin = origin;
    context.li = vec3(0.0);
    context.beta = vec3(1.0);
    context.specDisabled = 0.0;
    context.abort = false;
  }

  void raytraceStep(
    inout RaytraceContext context,
    in MaterialInfo mInfo,
    int numStep,
    bool lastStep,
    sampler2D randomMap,
    sampler2D bvhMap,
    sampler2D atlasMap,
    vec2 bvhMapSize,
    int bvhRootAddr
  ) {
    vec3 prevOrigin = context.origin;
    context.origin = mInfo.position + mInfo.normal * 0.0001;

    // Sample the light source
    PointLight light;
    light.position = vec3(-0.25, 4.7, -3.0);
    light.color = vec3(1.0);
    light.intensity = vec3(10.0 / PI, 0.2, 100.0);

    vec3 lightDir = shootPointLight(context.origin, light, randVec3(randomMap));
    float lightDist = length(lightDir);
    lightDir /= lightDist;

    vec3 V = -context.dir;
    vec3 N = mInfo.normal;
    
    if (!intersectMeshOcclude(context.origin, lightDir, lightDist, bvhMap, bvhMapSize, 0)) {
      vec3 L;
      vec3 radiance = calcPointLight(L, V, N, mInfo.position, light);
      vec3 lightingColor;
      if (context.specDisabled > 0.5) {
        float dotNL = max(dot(N, L), 0.0);
        vec3 diffuseColor = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
        lightingColor = diffuseColor * dotNL * radiance / PI;
      } else {
        lightingColor = calcBRDF(L, V, N, mInfo) * radiance;
      }
      context.li += lightingColor * context.beta;
    }

    // Run BRDF
    if (lastStep) return;

    vec3 L;
    vec3 diffuseColor = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
    vec3 specColor = mix(vec3(0.04), mInfo.albedo, mInfo.metalic);
    // determine if we should use diffuse or not
    float probDiffuse = mix(probabilityToSampleDiffuse(diffuseColor, specColor), 1.0, context.specDisabled);
    if (probDiffuse > randFloat(randomMap)) {
      // diffuse
      L = normalize(mInfo.normal + sampleSphere(randVec3(randomMap)));
      context.beta *= diffuseColor / probDiffuse;
      context.specDisabled = 1.0;
    } else {
      // specular
      float roughness = max(mInfo.roughness * mInfo.roughness, 0.0001);

      vec3 H = importanceSampleGGX(randVec2(randomMap), mInfo.normal, roughness);
      L = reflect(context.dir, H);

      float dotNH = max(dot(N, H), 0.0);
      float dotNL = max(dot(N, L), 0.0);
      
      vec3 F;
      vec3 spec = specCookTorrGGX(L, V, N, roughness, diffuseColor, specColor, F);

      float specPdf = pdfDistributionGGX(
        dotNH,
        max(dot(H, L), 0.0),
        roughness
      );
      
      float pdf = specPdf * (1.0 - probDiffuse);
      context.beta *= dotNL * spec / max(pdf, 0.001);
      // specularDisabled = 1.0;
    }
    
    context.dir = L;

    // russian roulette
    if (numStep >= 2) {
      float q = 1.0 - luminance(context.beta);
      if (randFloat(randomMap) < q) {
        context.abort = true;
      }
      context.beta /= 1.0 - q;
    }
  }
`;
