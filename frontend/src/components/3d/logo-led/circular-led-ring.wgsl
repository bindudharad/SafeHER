struct Params {
  resolution: vec2f,
  time: f32,
  hover: f32,
  pointer: vec2f,
  reduced: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

const PI: f32 = 3.14159265;
const TWO_PI: f32 = 6.28318530;

fn ringGlow(dist: f32, radius: f32, thickness: f32, glowWidth: f32) -> vec2f {
  let d = abs(dist - radius);
  let core = exp(-(d * d) / max(0.00001, thickness * thickness));
  let halo = exp(-(d * d) / max(0.0001, glowWidth * glowWidth));
  return vec2f(core, halo);
}

fn travellingArc(angle: f32, headAngle: f32, tailLength: f32, dir: f32) -> f32 {
  // Signed angular distance behind the moving head in direction `dir`
  let delta = ((headAngle - angle) * dir) % TWO_PI;
  let wrapped = select(delta + TWO_PI, delta, delta >= 0.0);
  let trail = exp(-wrapped / max(0.05, tailLength));
  let head = exp(-(wrapped * wrapped) / 0.012);
  return clamp(trail * 0.85 + head * 0.65, 0.0, 1.35);
}

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = max(params.resolution, vec2f(1.0));
  let minDim = min(res.x, res.y);
  let uv = (pos.xy - res.xy * 0.5) / (minDim * 0.5);
  let r = length(uv);
  let angle = atan2(uv.y, uv.x);

  // Midnight Aurora palette
  let auroraViolet = vec3f(0.545, 0.486, 1.0);   // #8B7CFF
  let deepPurple   = vec3f(0.396, 0.0,   0.722); // #6500B8
  let iceCyan      = vec3f(0.333, 0.839, 0.910); // #55D6E8
  let mintAccent   = vec3f(0.322, 0.839, 0.698); // #52D6B2
  let cloudWhite   = vec3f(0.957, 0.961, 1.0);   // #F4F5FF

  let t = select(params.time, 0.0, params.reduced > 0.5);

  // Subtle pointer proximity boost
  let pDist = length(uv - params.pointer);
  let pointerBoost = 1.0 + params.hover * 0.42 * exp(-(pDist * pDist) * 2.2);

  var col = vec3f(0.0);

  // Soft outer ambient violet nebula behind the medallion
  let ambient = exp(-(r - 0.54) * (r - 0.54) / 0.14) * 0.24;
  col += mix(deepPurple, auroraViolet, 0.55) * ambient;

  // Inner concentric LED ring (r = 0.47): fast Ice Cyan counter-rotating trail
  let innerRing = ringGlow(r, 0.47, 0.008, 0.045);
  let innerTrail = travellingArc(angle, -t * 1.15, 0.65, -1.0)
                 + travellingArc(angle, -t * 1.15 + PI, 0.55, -1.0) * 0.75;
  col += iceCyan * (innerRing.x * (0.28 + 0.95 * innerTrail) + innerRing.y * 0.22);

  // Main primary circular LED ring (r = 0.58): dual Violet + Cyan segmented pulses
  let mainRing = ringGlow(r, 0.58, 0.011, 0.075);
  let mainVioletA = travellingArc(angle, t * 0.78, 0.95, 1.0);
  let mainVioletB = travellingArc(angle, t * 0.78 + PI, 0.85, 1.0);
  let mainCyan    = travellingArc(angle, -t * 0.52 + 1.2, 0.55, -1.0);
  let segmented   = 0.55 + 0.45 * sin(angle * 12.0 - t * 1.2);
  let mainEnergy  = 0.32 * segmented + 0.95 * (mainVioletA + mainVioletB * 0.85);
  col += mix(auroraViolet, cloudWhite, 0.18 * mainVioletA) * (mainRing.x * mainEnergy + mainRing.y * 0.34);
  col += iceCyan * mainRing.x * mainCyan * 0.85;

  // Outer concentric LED ring (r = 0.71): slow Violet + subtle Mint pulse
  let outerRing = ringGlow(r, 0.71, 0.007, 0.055);
  let outerTrail = travellingArc(angle, t * 0.42 + 2.1, 0.75, 1.0);
  let mintPulse  = travellingArc(angle, -t * 0.65 + 4.0, 0.35, -1.0);
  col += auroraViolet * (outerRing.x * (0.18 + 0.78 * outerTrail) + outerRing.y * 0.16);
  col += mintAccent * outerRing.x * mintPulse * 0.55;

  // Subtle radial fade at canvas edges so there is never a hard clipping box
  let edgeFade = 1.0 - smoothstep(0.76, 0.98, r);
  col *= pointerBoost * edgeFade;

  let alpha = clamp(max(col.r, max(col.g, col.b)) * 1.35, 0.0, 0.95);
  return vec4f(col, alpha);
}
