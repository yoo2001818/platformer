export const INTERSECTION = /* glsl */`
  const float INTERSECT_EPSILON = 0.0000001;

  bool intersectRayAABB(
    vec3 boxMin,
    vec3 boxMax,
    vec3 origin,
    vec3 dir,
    out float nearDist
  ) {
    vec3 tbot = (boxMin - origin) / dir;
    vec3 ttop = (boxMax - origin) / dir;
    vec3 tmin = min(ttop, tbot);
    vec3 tmax = max(ttop, tbot);
    vec2 t = max(tmin.xx, tmin.yz);
    float t0 = max(t.x, t.y);
    t = min(tmax.xx, tmax.yz);
    float t1 = min(t.x, t.y);
    nearDist = t0;
    return t1 > max(t0, 0.0);
  }

  bool intersectRayTriangle(
    out vec3 outBarycentric,
    out float outDist,
    vec3 v0,
    vec3 v1,
    vec3 v2,
    vec3 origin,
    vec3 dir
  ) {
    vec3 e0 = v1 - v0;
    vec3 e1 = v0 - v2;
    vec3 normal = cross(e1, e0);
    vec3 e2 = (1.0 / dot(normal, dir)) * (v0 - origin);
    vec3 i = cross(dir, e2);
    outBarycentric.y = dot(i, e1);
    outBarycentric.z = dot(i, e0);
    outBarycentric.x = 1.0 - (outBarycentric.z + outBarycentric.y);
    outDist = dot(normal, e2);
    return outDist > INTERSECT_EPSILON &&
      all(greaterThanEqual(outBarycentric, vec3(0.0)));
  }

  vec4 bvhTexelFetch(
    int addr,
    sampler2D bvhMap,
    vec2 bvhMapSize,
    vec2 bvhMapSizeInv
  ) {
    float addrFloat = float(addr);
    #ifdef WEBGL2
      ivec2 coord = ivec2(
        int(mod(addrFloat, bvhMapSize.x)),
        int(addrFloat * bvhMapSizeInv.x)
      );
      return texelFetch(bvhMap, coord, 0);
    #else
      vec2 coord = vec2(
        mod(addrFloat, bvhMapSize.x),
        addrFloat * bvhMapSizeInv.x
      ) * bvhMapSizeInv;
      return texture2D(bvhMap, coord);
    #endif
  }

  struct BVHIntersectResult {
    float childId;
    mat4 matrix;
    int faceAddr;
    vec3 position;
    vec3 barycentric;
    float rayDist;
  };

  struct BVHTLASLeaf {
    vec3 boxMin;
    vec3 boxMax;
    float childId;
    int blasAddr;
    mat4 matrix;
    mat4 invMatrix;
  };

  struct BVHBLASLeaf {
    // float id[3];
    // vec3 position[3];
    mat3 normal;
    mat3x2 texCoord;
    vec4 tangent;
    float faceId;
  };

  void bvhTLASFetch(
    out BVHTLASLeaf outResult,
    int addr,
    sampler2D bvhMap,
    vec2 bvhMapSize,
    vec2 bvhMapSizeInv
  ) {
    vec4 texelMin = bvhTexelFetch(addr, bvhMap, bvhMapSize, bvhMapSizeInv);
    vec4 texelMax = bvhTexelFetch(addr + 1, bvhMap, bvhMapSize, bvhMapSizeInv);
    outResult.boxMin = texelMin.xyz;
    outResult.childId = texelMin.w;
    outResult.boxMax = texelMax.xyz;
    outResult.blasAddr = int(texelMax.w);
    for (int i = 0; i < 4; ++i) {
      outResult.matrix[i] = bvhTexelFetch(addr + 2 + i, bvhMap, bvhMapSize, bvhMapSizeInv);
    }
    for (int i = 0; i < 4; ++i) {
      outResult.invMatrix[i] = bvhTexelFetch(addr + 6 + i, bvhMap, bvhMapSize, bvhMapSizeInv);
    }
  }

  void bvhBLASFetch(
    out BVHBLASLeaf outResult,
    int addr,
    sampler2D bvhMap,
    vec2 bvhMapSize,
    vec2 bvhMapSizeInv
  ) {
    /*
    for (int i = 0; i < 3; ++i) {
      vec4 texel = bvhTexelFetch(addr + i, bvhMap, bvhMapSize, bvhMapSizeInv);
      outResult.position[i] = texel.xyz;
      outResult.id[i] = texel.w;
    }
    */
    vec4 texel3 = bvhTexelFetch(addr + 3, bvhMap, bvhMapSize, bvhMapSizeInv);
    vec4 texel4 = bvhTexelFetch(addr + 4, bvhMap, bvhMapSize, bvhMapSizeInv);
    vec4 texel5 = bvhTexelFetch(addr + 5, bvhMap, bvhMapSize, bvhMapSizeInv);
    outResult.normal = mat3(texel3.xyz, texel4.xyz,texel5.xyz);
    outResult.faceId = texel3.w;
    outResult.tangent.x = texel4.w;
    outResult.tangent.y = texel5.w;
    vec4 texel6 = bvhTexelFetch(addr + 6, bvhMap, bvhMapSize, bvhMapSizeInv);
    vec4 texel7 = bvhTexelFetch(addr + 7, bvhMap, bvhMapSize, bvhMapSizeInv);
    outResult.texCoord = mat3x2(texel6.xy, texel6.zw, texel7.xy);
    outResult.tangent.zw = texel7.zw;
  }

  #define BVH_MAX_STACK 64
  #define BVH_MAX_LOOP 800
  #define BVH_NODE_SIZE 2
  #define BVH_TLAS_SIZE 10
  #define BVH_BLAS_SIZE 8
  #define BVH_MAX_DIST 1000000.0

  #ifdef BVH_DEBUG
    int bvhAABBTests = 0;
    int bvhTriangleTests = 0;
  #endif

  #ifndef WEBGL2
  // In WebGL 1, it's not possible to use array random access. Although 
  // extremely slow, this makes it possible to implement this in GLSL ES 2.0...
  void storeStackEntry(inout ivec3 stack[BVH_MAX_STACK], int stackPos, ivec3 current) {
    for (int j = 0; j < BVH_MAX_STACK; j += 1) {
      if (j == stackPos) {
        stack[j] = current;
        break;
      }
    }
  }
  
  void loadStackEntry(inout ivec3 stack[BVH_MAX_STACK], int stackPos, out ivec3 current) {
    for (int j = 0; j < BVH_MAX_STACK; j += 1) {
      if (j == stackPos) {
        current = stack[j];
        break;
      }
    }
  }
  #endif

  bool intersectBVH(
    out BVHIntersectResult outResult,
    sampler2D bvhMap,
    vec2 bvhMapSize,
    vec2 bvhMapSizeInv,
    int rootAddr,
    vec3 origin,
    vec3 dir,
    float maxDist
  ) {
    vec4 rootTexel0 = bvhTexelFetch(rootAddr, bvhMap, bvhMapSize, bvhMapSizeInv);
    vec4 rootTexel1 = bvhTexelFetch(rootAddr + 1, bvhMap, bvhMapSize, bvhMapSizeInv);
    outResult.rayDist = maxDist;
    // Stack contains: addr, left, right
    ivec3 stack[BVH_MAX_STACK];
    ivec3 current;
    current = ivec3(rootAddr, int(rootTexel0.w), int(rootTexel1.w));
    int stackPos = 0;
    int stackDivider = 0;
    int tlasOffset = 0;
    int blasOffset = 0;
    BVHTLASLeaf tlasLeaf;
    vec3 blasOrigin;
    vec3 blasDir;
    int blasResultAddr = -1;
    vec3 blasResultPos;
    vec3 blasResultBarycentric;
    float blasResultDist;
    float nearDist;
    bool hasIntersection = false;
    for (int i = 0; i < BVH_MAX_LOOP; ++i) {
      if (stackPos < 0) break;
      bool isTLAS = stackPos <= stackDivider;
      bool isPopping = false;
      if (isTLAS && current.y < 0) {
        int childLength = current.z;
        bool hasChild = false;
        int childAddr = -current.y + tlasOffset * BVH_TLAS_SIZE;
        bvhTLASFetch(tlasLeaf, childAddr, bvhMap, bvhMapSize, bvhMapSizeInv);
        tlasOffset += 1;
        if (tlasOffset > childLength) {
          tlasOffset = 0;
          stackPos -= 1;
          isPopping = true;
        } else {
          bool isIntersecting = intersectRayAABB(
            tlasLeaf.boxMin, tlasLeaf.boxMax, origin, dir, nearDist
          );
          #ifdef BVH_DEBUG
            bvhAABBTests += 1;
          #endif
          if (isIntersecting && nearDist < outResult.rayDist) {
            hasChild = true;
            blasOrigin = (tlasLeaf.invMatrix * vec4(origin, 1.0)).xyz;
            blasDir = normalize((tlasLeaf.invMatrix * vec4(dir, 0.0)).xyz);
            blasResultAddr = -1;
            blasResultDist = BVH_MAX_DIST;
            // Retrieve blas root node
            vec4 blasMin =
              bvhTexelFetch(tlasLeaf.blasAddr, bvhMap, bvhMapSize, bvhMapSizeInv);
            vec4 blasMax =
              bvhTexelFetch(tlasLeaf.blasAddr + 1, bvhMap, bvhMapSize, bvhMapSizeInv);
            #ifdef WEBGL2
            stack[stackPos] = current;
            #else
            storeStackEntry(stack, stackPos, current);
            #endif
            current = ivec3(tlasLeaf.blasAddr, int(blasMin.w), int(blasMax.w));
            stackDivider = stackPos;
            stackPos += 1;
          }
        }
      } else if (current.y < 0) {
        int childLength = current.z;
        int childAddr = -current.y + blasOffset * BVH_BLAS_SIZE;
        // We only retrieve 3 texels at this point - more detailed
        // data can be retrieved later
        vec3 v0 = bvhTexelFetch(childAddr, bvhMap, bvhMapSize, bvhMapSizeInv).xyz;
        vec3 v1 = bvhTexelFetch(childAddr + 1, bvhMap, bvhMapSize, bvhMapSizeInv).xyz;
        vec3 v2 = bvhTexelFetch(childAddr + 2, bvhMap, bvhMapSize, bvhMapSizeInv).xyz;
        vec3 resultPos;
        vec3 resultBarycentric;
        float resultDist;
        bool isIntersecting = intersectRayTriangle(
          resultBarycentric, resultDist,
          v0, v1, v2,
          blasOrigin,
          blasDir
        );
        #ifdef BVH_DEBUG
          bvhTriangleTests += 1;
        #endif
        if (isIntersecting && resultDist < blasResultDist) {
          resultPos = blasOrigin + blasDir * resultDist;
          blasResultAddr = childAddr;
          blasResultPos = resultPos;
          blasResultBarycentric = resultBarycentric;
          blasResultDist = resultDist;
        }
        blasOffset += 1;
        if (blasOffset >= childLength) {
          stackPos -= 1;
          blasOffset = 0;
          isPopping = true;
        }
      } else {
        vec3 currOrigin;
        vec3 currDir;
        float currDist;
        if (isTLAS) {
          currOrigin = origin;
          currDir = dir;
          currDist = outResult.rayDist;
        } else {
          currOrigin = blasOrigin;
          currDir = blasDir;
          currDist = blasResultDist;
        }
        vec4 leftMin =
          bvhTexelFetch(current.y, bvhMap, bvhMapSize, bvhMapSizeInv);
        vec4 leftMax =
          bvhTexelFetch(current.y + 1, bvhMap, bvhMapSize, bvhMapSizeInv);
        vec4 rightMin =
          bvhTexelFetch(current.z, bvhMap, bvhMapSize, bvhMapSizeInv);
        vec4 rightMax =
          bvhTexelFetch(current.z + 1, bvhMap, bvhMapSize, bvhMapSizeInv);
        float nearDistLeft;
        float nearDistRight;
        bool leftIntersects =
          intersectRayAABB(leftMin.xyz, leftMax.xyz, currOrigin, currDir, nearDistLeft);
        bool rightIntersects =
          intersectRayAABB(rightMin.xyz, rightMax.xyz, currOrigin, currDir, nearDistRight);
        #ifdef BVH_DEBUG
          bvhAABBTests += 2;
        #endif
        leftIntersects = leftIntersects && currDist > nearDistLeft;
        rightIntersects = rightIntersects && currDist > nearDistRight;
        if (leftIntersects && rightIntersects) {
          if (nearDistLeft < nearDistRight) {
            #ifdef WEBGL2
            stack[stackPos] = ivec3(current.y, int(leftMin.w), int(leftMax.w));
            #else
            storeStackEntry(stack, stackPos, ivec3(current.y, int(leftMin.w), int(leftMax.w)));
            #endif
            current = ivec3(current.z, int(rightMin.w), int(rightMax.w));
          } else {
            #ifdef WEBGL2
            stack[stackPos] = ivec3(current.y, int(rightMin.w), int(rightMax.w));
            #else
            storeStackEntry(stack, stackPos, ivec3(current.y, int(rightMin.w), int(rightMax.w)));
            #endif
            current = ivec3(current.z, int(leftMin.w), int(leftMax.w));
          }
          stackPos += 1;
          if (isTLAS) {
            stackDivider += 1;
          }
        } else if (leftIntersects) {
          current = ivec3(current.y, int(leftMin.w), int(leftMax.w));
        } else if (rightIntersects) {
          current = ivec3(current.z, int(rightMin.w), int(rightMax.w));
        } else {
          stackPos -= 1;
          isPopping = true;
        }
      }
      if (isPopping) {
        #ifdef WEBGL2
        current = stack[stackPos];
        #else
        loadStackEntry(stack, stackPos, current);
        #endif
        if (stackPos == stackDivider) {
          if (blasResultAddr != -1) {
            vec3 resultPos = (tlasLeaf.matrix * vec4(blasResultPos, 1.0)).xyz;
            float resultDist = distance(resultPos, origin);
            hasIntersection = true;
            if (resultDist < outResult.rayDist) {
              outResult.childId = tlasLeaf.childId;
              outResult.faceAddr = blasResultAddr;
              outResult.position = resultPos;
              outResult.barycentric = blasResultBarycentric;
              outResult.rayDist = resultDist;
              outResult.matrix = tlasLeaf.matrix;
            }
          }
        }
      }
    }
    return hasIntersection;
  }
`;

export const MATERIAL_INJECTOR = /* glsl */`
  void unpackMaterialInfoBVH(
    inout MaterialInfo mOut,
    vec3 position,
    vec3 normal,
    vec2 texCoord,
    sampler2D atlasMap,
    int matAddr,
    sampler2D bvhMap,
    vec2 bvhMapSize,
    vec2 bvhMapSizeInv
  ) {
    vec4 texel0 = bvhTexelFetch(matAddr, bvhMap, bvhMapSize, bvhMapSizeInv);
    vec4 texel1 = bvhTexelFetch(matAddr + 1, bvhMap, bvhMapSize, bvhMapSizeInv);
    vec4 texel2 = bvhTexelFetch(matAddr + 2, bvhMap, bvhMapSize, bvhMapSizeInv);
    mOut.position = position;
    mOut.normal = normal;
    mOut.albedo = texel1.rgb;
    mOut.roughness = texel0.r;
    mOut.metalic = texel0.g;
    if (texel0.b > 0.0) {
      vec2 uv = fract(texCoord) * texel2.zw + texel2.xy;
      mOut.albedo = pow(texture2D(atlasMap, uv).rgb, vec3(2.2));
    }
  }
`;

export const INTERSECTION_MESH = /* glsl */`
  bool intersectMesh(
    out MaterialInfo mInfo,
    vec3 origin,
    vec3 dir,
    sampler2D bvhMap,
    sampler2D atlasMap,
    vec2 bvhMapSize,
    int bvhRootAddr
  ) {
    vec2 bvhMapSizeInv = 1.0 / bvhMapSize;
    BVHIntersectResult bvhResult;
    bool isIntersecting = intersectBVH(
      bvhResult,
      bvhMap,
      bvhMapSize,
      bvhMapSizeInv,
      bvhRootAddr,
      origin,
      dir,
      BVH_MAX_DIST
    );
    if (!isIntersecting) {
      return false;
    }
    BVHBLASLeaf blas;
    bvhBLASFetch(blas, bvhResult.faceAddr, bvhMap, bvhMapSize, bvhMapSizeInv);
    vec3 normal = blas.normal * bvhResult.barycentric;
    normal = normalize((bvhResult.matrix * vec4(normal, 0.0)).xyz);
    if (dot(normal, dir) > 0.0) {
      // normal *= -1.0;
    }
    vec2 texCoord = blas.texCoord * bvhResult.barycentric;
    unpackMaterialInfoBVH(
      mInfo,
      bvhResult.position,
      normal,
      texCoord,
      atlasMap,
      int(bvhResult.childId),
      bvhMap,
      bvhMapSize,
      bvhMapSizeInv
    );
    return true;
  }

  bool intersectMeshOcclude(
    vec3 origin,
    vec3 dir,
    float maxDist,
    sampler2D bvhMap,
    vec2 bvhMapSize,
    int bvhRootAddr
  ) {
    vec2 bvhMapSizeInv = 1.0 / bvhMapSize;
    BVHIntersectResult lightResult;
    bool isLightIntersecting = intersectBVH(
      lightResult,
      bvhMap,
      bvhMapSize,
      bvhMapSizeInv,
      bvhRootAddr,
      origin,
      dir,
      maxDist
    );
    return isLightIntersecting && (lightResult.rayDist - maxDist <= 0.000001);
  }
`;
