export const SAMPLE = /* glsl */`
  vec4 randTexel;
  int randPtr = 0;
  vec2 randPos;
  vec2 randSeed;
  
  void randInit(vec2 pos, vec2 seed) {
    randPos = pos; 
    randSeed = seed;
  }

  float randFloat(sampler2D randomMap) {
    if (randPtr == 0) {
      randTexel = texture2D(randomMap, randPos);
    }
    float result;
    if (randPtr == 0) {
      result = randTexel.r;
    } else if (randPtr == 1) {
      result = randTexel.g;
    } else if (randPtr == 2) {
      result = randTexel.b;
    } else if (randPtr == 3) {
      result = randTexel.w;
    }
    randPtr += 1;
    if (randPtr == 4) {
      randPtr = 0;
      randPos += randSeed;
    }
    return result;
  }

  vec2 randVec2(sampler2D randomMap) {
    return vec2(randFloat(randomMap), randFloat(randomMap));
  }

  vec3 randVec3(sampler2D randomMap) {
    return vec3(randFloat(randomMap), randFloat(randomMap), randFloat(randomMap));
  }

  // https://graphics.pixar.com/library/OrthonormalB/paper.pdf
  mat3 orthonormalBasis(vec3 n) {
    float zsign = n.z >= 0.0 ? 1.0 : -1.0;
    float a = -1.0 / (zsign + n.z);
    float b = n.x * n.y * a;
    vec3 s = vec3(1.0 + zsign * n.x * n.x * a, zsign * b, -zsign * n.x);
    vec3 t = vec3(b, zsign + n.y * n.y * a, -n.y);
    return mat3(s, t, n);
  }

  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#SamplingaUnitDisk
  vec2 sampleCircle(vec2 p) {
    p = 2.0 * p - 1.0;

    bool greater = abs(p.x) > abs(p.y);

    float r = greater ? p.x : p.y;
    float theta = greater ? 0.25 * PI * p.y / p.x : PI * (0.5 - 0.25 * p.x / p.y);

    return r * vec2(cos(theta), sin(theta));
  }

  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling
  vec3 cosineSampleHemisphere(vec2 p) {
    vec2 h = sampleCircle(p);
    float z = sqrt(max(0.0, 1.0 - h.x * h.x - h.y * h.y));
    return vec3(h, z);
  }

  vec3 sampleSphere(vec3 p) {
    return normalize(p * 2.0 - 1.0);
  }
`;
