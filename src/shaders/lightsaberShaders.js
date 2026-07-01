export const PLANET_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 customColor;
  attribute float opacityAttr;
  attribute float orbitSpeed;
  attribute float aIsRing;
  attribute float aIsAtmo;
  attribute float aRandomId;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vDist;
  varying float vOpacity;
  varying float vScaleFactor;
  varying float vIsRing;
  varying float vIsAtmo;

  uniform float uTime;
  uniform float uScale;
  uniform float uRotationX;

  mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
  }

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float normScaleLOD = clamp((uScale - 0.15) / 2.35, 0.0, 1.0);
    float visibilityThreshold = 0.88 + pow(normScaleLOD, 1.2) * 0.12;

    if (aRandomId > visibilityThreshold) {
      gl_Position = vec4(0.0);
      gl_PointSize = 0.0;
      return;
    }

    vec3 pos = position;

    if (aIsRing > 0.5) {
      float angleOffset = uTime * orbitSpeed * 0.22 + aPhase * 6.2831;
      vec2 rotatedXZ = rotate2d(angleOffset) * pos.xz;
      pos.x = rotatedXZ.x;
      pos.z = rotatedXZ.y;
    } else if (aIsAtmo > 0.5) {
      float atmoAngle = uTime * 0.04 + aPhase * 12.566;
      vec2 rxz = rotate2d(atmoAngle) * pos.xz;
      pos.x = rxz.x;
      pos.z = rxz.y;
    } else {
      float bodyAngle = uTime * 0.08 + aPhase * 0.0;
      vec2 rotatedXZ = rotate2d(bodyAngle) * pos.xz;
      pos.x = rotatedXZ.x;
      pos.z = rotatedXZ.y;
    }

    float cx = cos(uRotationX);
    float sx = sin(uRotationX);
    float ry = pos.y * cx - pos.z * sx;
    float rz = pos.y * sx + pos.z * cx;
    pos.y = ry;
    pos.z = rz;

    vec4 mvPosition = modelViewMatrix * vec4(pos * uScale, 1.0);
    float dist = -mvPosition.z;
    vDist = dist;

    float chaosThreshold = 45.0;
    if (dist < chaosThreshold && dist > 0.1 && (aIsAtmo > 0.5 || aIsRing > 0.5)) {
      float chaosIntensity = 1.0 - (dist / chaosThreshold);
      chaosIntensity = pow(chaosIntensity, 2.2);
      float highFreqTime = uTime * 50.0;
      float noiseX = sin(highFreqTime + pos.x * 18.0) * hash(pos.y * 10.0 + aPhase);
      float noiseY = cos(highFreqTime * 0.9 + pos.y * 14.0) * hash(pos.x * 10.0);
      float noiseZ = sin(highFreqTime * 0.5) * hash(aRandomId * 100.0);
      vec3 noiseVec = vec3(noiseX, noiseY, noiseZ) * chaosIntensity * (aIsAtmo > 0.5 ? 1.6 : 0.8);
      mvPosition.xyz += noiseVec;
    }

    gl_Position = projectionMatrix * mvPosition;

    float pointSize = size * (350.0 / dist);
    if (aIsAtmo > 0.5) pointSize *= 2.2;
    else if (aIsRing > 0.5) pointSize *= 1.1;
    else pointSize *= 0.75;
    pointSize *= 0.58;

    if (aIsRing < 0.5 && aIsAtmo < 0.5 && dist < 55.0) {
      pointSize *= 0.78;
    }

    gl_PointSize = clamp(pointSize, 0.0, 320.0);

    vColor = customColor;
    vOpacity = opacityAttr;
    vScaleFactor = uScale;
    vIsRing = aIsRing;
    vIsAtmo = aIsAtmo;
  }
`;

export const PLANET_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vDist;
  varying float vOpacity;
  varying float vScaleFactor;
  varying float vIsRing;
  varying float vIsAtmo;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;

    float glow;
    if (vIsAtmo > 0.5) {
      glow = pow(smoothstep(1.0, 0.0, r), 1.8);
    } else if (vIsRing > 0.5) {
      glow = smoothstep(1.0, 0.2, r);
    } else {
      glow = smoothstep(1.0, 0.3, r);
    }

    float t = clamp((vScaleFactor - 0.15) / 2.35, 0.0, 1.0);

    vec3 deepTone = vColor * 0.22;
    float colorMix = smoothstep(0.08, 0.92, t);
    vec3 baseColor = mix(deepTone, vColor, colorMix);

    float brightness = 0.35 + 1.3 * t;
    float densityAlpha = 0.28 + 0.52 * smoothstep(0.0, 0.5, t);
    vec3 finalColor = baseColor * brightness;

    if (vDist < 55.0) {
      float closeMix = 1.0 - (vDist / 55.0);
      if (vIsRing < 0.5 && vIsAtmo < 0.5) {
        vec3 deepTexture = pow(vColor, vec3(1.3)) * 1.7;
        finalColor = mix(finalColor, deepTexture, closeMix * 0.75);
      } else if (vIsAtmo > 0.5) {
        finalColor += vColor * 0.55 * closeMix;
      } else {
        finalColor += vColor * 0.22 * closeMix;
      }
    }

    float depthAlpha = 1.0;
    if (vDist < 9.0) depthAlpha = smoothstep(0.0, 9.0, vDist);

    float alpha = glow * vOpacity * densityAlpha * depthAlpha;
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const STAR_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  uniform float uTime;

  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;
    gl_PointSize = size * (1000.0 / dist);
    gl_PointSize = clamp(gl_PointSize, 1.0, 8.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  uniform float uTime;
  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float noise = random(gl_FragCoord.xy);
    float twinkle = 0.72 + 0.28 * sin(uTime * 2.0 + noise * 10.0);
    float glow = 1.0 - r;
    glow = pow(glow, 1.5);
    gl_FragColor = vec4(vColor * twinkle, glow * 0.82);
  }
`;

export const NEBULA_FRAGMENT_SHADER = `
  varying vec3 vColor;
  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float glow = pow(1.0 - r, 2.0);
    gl_FragColor = vec4(vColor, glow * 0.15);
  }
`;

export const PLANET_MESH_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const PLANET_MESH_FRAGMENT_SHADER = `
  uniform vec3 color1;
  uniform vec3 color2;
  uniform float noiseScale;
  uniform vec3 lightDir;
  uniform float atmosphere;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float n = fbm(vUv * noiseScale);
    vec3 albedo = mix(color1, color2, n);
    vec3 normal = normalize(vNormal);
    vec3 light = normalize(lightDir);
    float diff = max(dot(normal, light), 0.06);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 finalColor = albedo * diff + atmosphere * vec3(0.45, 0.7, 1.0) * fresnel;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
