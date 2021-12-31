export const DENOISE = /* glsl */`
  // Edge-Avoiding À-TrousWavelet Transform for denoising
  // implemented on https://www.shadertoy.com/view/ldKBzG
  // feel free to use it

  vec4 alignedTexture2D(sampler2D samp, vec2 uv, vec2 resolution, vec2 subdiv) {
    vec2 pixelUV = floor(mod(uv * resolution, subdiv));
    vec2 newUV = (uv + pixelUV) / subdiv;
    return texture2D(samp, newUV);
  }

  vec4 denoiseRaytrace(vec2 uv, float strength, sampler2D rayMap, sampler2D normalMap, vec2 resolution, vec2 invResolution, vec2 subdiv) {
    vec2 offset[25];
    offset[0] = vec2(-2,-2);
    offset[1] = vec2(-1,-2);
    offset[2] = vec2(0,-2);
    offset[3] = vec2(1,-2);
    offset[4] = vec2(2,-2);
    
    offset[5] = vec2(-2,-1);
    offset[6] = vec2(-1,-1);
    offset[7] = vec2(0,-1);
    offset[8] = vec2(1,-1);
    offset[9] = vec2(2,-1);
    
    offset[10] = vec2(-2,0);
    offset[11] = vec2(-1,0);
    offset[12] = vec2(0,0);
    offset[13] = vec2(1,0);
    offset[14] = vec2(2,0);
    
    offset[15] = vec2(-2,1);
    offset[16] = vec2(-1,1);
    offset[17] = vec2(0,1);
    offset[18] = vec2(1,1);
    offset[19] = vec2(2,1);
    
    offset[20] = vec2(-2,2);
    offset[21] = vec2(-1,2);
    offset[22] = vec2(0,2);
    offset[23] = vec2(1,2);
    offset[24] = vec2(2,2);
    
    
    float kernel[25];
    kernel[0] = 1.0f/256.0f;
    kernel[1] = 1.0f/64.0f;
    kernel[2] = 3.0f/128.0f;
    kernel[3] = 1.0f/64.0f;
    kernel[4] = 1.0f/256.0f;
    
    kernel[5] = 1.0f/64.0f;
    kernel[6] = 1.0f/16.0f;
    kernel[7] = 3.0f/32.0f;
    kernel[8] = 1.0f/16.0f;
    kernel[9] = 1.0f/64.0f;
    
    kernel[10] = 3.0f/128.0f;
    kernel[11] = 3.0f/32.0f;
    kernel[12] = 9.0f/64.0f;
    kernel[13] = 3.0f/32.0f;
    kernel[14] = 3.0f/128.0f;
    
    kernel[15] = 1.0f/64.0f;
    kernel[16] = 1.0f/16.0f;
    kernel[17] = 3.0f/32.0f;
    kernel[18] = 1.0f/16.0f;
    kernel[19] = 1.0f/64.0f;
    
    kernel[20] = 1.0f/256.0f;
    kernel[21] = 1.0f/64.0f;
    kernel[22] = 3.0f/128.0f;
    kernel[23] = 1.0f/64.0f;
    kernel[24] = 1.0f/256.0f;
    
    vec4 sum = vec4(0.0);
    float c_phi = 1.0;
    float n_phi = 0.3;
    //float p_phi = 0.3;
    vec4 cval = alignedTexture2D(rayMap, uv, resolution, subdiv);
    cval /= max(cval.w, 1.0);
    vec4 nval = texture2D(normalMap, uv);
    //vec4 pval = texelFetch(iChannel2, ivec2(fragCoord), 0);
    
    float cum_w = 0.0;
    for(int i = 0; i < 25; i++) {
        vec2 nextUV = uv + offset[i] * strength * invResolution;
        
        vec4 ctmp = alignedTexture2D(rayMap, nextUV, resolution, subdiv);
        ctmp /= max(ctmp.w, 1.0);
        vec4 t = cval - ctmp;
        float dist2 = dot(t,t);
        float c_w = min(exp(-(dist2)/c_phi), 1.0);
        
        vec4 ntmp = texture2D(normalMap, nextUV);
        t = nval - ntmp;
        dist2 = max(dot(t,t), 0.0);
        float n_w = min(exp(-(dist2)/n_phi), 1.0);
        
        //vec4 ptmp = texelFetch(iChannel2, ivec2(uv), 0);
        //t = pval - ptmp;
        //dist2 = dot(t,t);
        //float p_w = min(exp(-(dist2)/p_phi), 1.0);
        
        //float weight = c_w*n_w*p_w;
        float weight = c_w*n_w;
        sum += ctmp*weight*kernel[i];
        cum_w += weight*kernel[i];
    }
    return sum / cum_w;
  }
`;
