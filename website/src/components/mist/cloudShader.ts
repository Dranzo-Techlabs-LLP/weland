// Volumetric valley fog, ray-marched over the aerial photo.
//
// The scene: a camera high above the resort looking down, and a layer of cloud
// lying on the land, with broken heaps of cloud piled on top of it. The scroll
// sinks the whole cloud. First the camera is among the heaps, then they drop
// away below it (you see them and the layer's billowing top from above), then
// the hilltop comes up through the fog (the resort first, being the highest
// ground), until the fog lies only in the valley, the way the photo shows it.
//
// The land under the fog is the photo; `ground()` below says roughly how high
// each part of it stands, so the fog knows where it can lie. The camera closes
// in on the resort exactly as the photo is zoomed, so the fog stays put on the
// land, with the parallax of real depth.
//
// Lighting matches the photo: blue-hour skylight, soft and from above, so the
// fog's top is bright and it darkens to blue-grey inside and in its hollows.

export const cloudVertex = /* glsl */ `#version 300 es
void main() {
  // one triangle that covers the screen
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const cloudFragment = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler3D uNoise;
uniform vec2 uRes;       // drawing-buffer size in pixels
uniform float uTime;     // seconds, for drift and billowing
uniform float uProgress; // 0 inside the cloud .. 1 fog down in the valley
uniform vec2 uFocus;     // the resort on the canvas (0..1, y up)
uniform vec4 uPhoto;     // the photo's box on the canvas before the zoom (x, y from bottom-left, w, h; 0..1)
uniform float uZoom;     // how far the photo has been scaled up (1 = not yet)
out vec4 outColor;

// Distances are in screen heights at the valley floor, as seen at the start.
const float FOV = 0.95;                 // screen height : distance
const float CAMERA = 1.0 / FOV;         // the camera's starting height
const float SIGMA = 16.0;               // how quickly the fog blocks the view
const float LEVEL_START = CAMERA - 0.15;  // the layer's top, at first just under the camera
const float LEVEL_END = 0.16;           // and at the end, down in the valley
const vec3 WIND = vec3(0.011, 0.004, 0.0);
const vec3 LIGHT_DIR = normalize(vec3(-0.3, 0.6, 0.75)); // the bright sky: high, towards the far hills
const vec3 LIT = vec3(0.92, 0.95, 1.0);                  // blue hour, as in the photo
const vec3 SHADE = vec3(0.48, 0.56, 0.68);

// Roughly how high the land stands under each point of the photo (x right,
// y down): highest on the resort's hilltop and the ridge to its right,
// falling away to the valley at the top left.
float ground(vec2 q) {
  float tilt = 0.45 + 0.6 * (q.x - 0.45) + 0.5 * (q.y - 0.35);
  vec2 r = q - vec2(0.62, 0.48);
  float hill = 0.5 * exp(-(r.x * r.x / 0.06 + r.y * r.y / 0.08));
  return 0.34 * clamp(tilt + hill, 0.0, 1.1);
}

// Fog density at a point, given the layer's top here, how high the broken
// heaps pile above it, and how far the whole cloud has sunk so far.
float fog(vec3 pos, float top, float heaps, float sunk) {
  float above = pos.z - top;
  if (above > heaps + 0.06) return 0.0; // (the layer's lumpy top can rise a little above it)
  vec3 drift = WIND * uTime;
  vec3 c = pos + vec3(0.0, 0.0, sunk); // the cloud's own frame: it sinks as one
  // lumps and hollows, flatter than they are wide
  float body = texture(uNoise, c * vec3(1.3, 1.3, 2.4) + drift).r;
  // fine detail that frays the edges into wisps, drifting against the body
  float fray = texture(uNoise, c * vec3(4.4, 4.4, 6.0) - drift * 1.6 + 0.5).r;
  // the layer: continuous, with a soft, frayed top
  float layer = smoothstep(0.0, 0.06, -above + (body - 0.55) * 0.12 - (1.0 - fray) * 0.045);
  // the heaps: fewer and smaller the higher they are, gone at the top
  float rise = clamp(above / max(heaps, 1e-3), 0.0, 1.0);
  float heap = smoothstep(0.0, 0.14, body - (1.0 - fray) * 0.22 - mix(0.3, 0.85, rise));
  heap *= 1.0 - smoothstep(0.75, 1.0, rise);
  return max(layer, heap) * mix(0.45, 1.0, body);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float p = uProgress;

  // Camera: starts centred, CAMERA high, and closes in on the resort as the
  // photo zooms, so the valley floor below stays locked to the photo.
  vec3 start = vec3(0.5 * aspect, 0.5, CAMERA);
  vec3 resort = vec3(uFocus.x * aspect, uFocus.y, 0.0);
  vec3 cam = mix(start, resort, 1.0 - 1.0 / uZoom);
  vec3 rd = normalize(vec3((uv - 0.5) * vec2(aspect, 1.0) * FOV, -1.0));
  float down = -rd.z;

  // Where this ray meets the valley floor, as a point in the photo.
  vec2 floorPoint = cam.xy + rd.xy * (cam.z / down);
  vec2 q = (vec2(floorPoint.x / aspect, floorPoint.y) - uPhoto.xy) / uPhoto.zw;
  float land = ground(vec2(q.x, 1.0 - q.y));

  // The cloud sinks: the layer from just under the camera to down in the
  // valley, the heaps on it settling into it as it goes.
  float level = mix(LEVEL_START, LEVEL_END, smoothstep(0.0, 0.8, p));
  float sunk = LEVEL_START - level;
  float heaps = 0.4 * (1.0 - smoothstep(0.25, 0.6, p));
  // Its top billows: slow cauliflower heads that drift and change shape.
  vec2 atTop = cam.xy + rd.xy * max(cam.z - level, 0.0) / down;
  float heads = texture(uNoise, vec3(atTop * 0.85 + WIND.xy * uTime * 0.6, 0.31 + uTime * 0.003)).r;
  float top = level + (heads - 0.5) * 0.16;
  // Thinning as the morning warms: what's left in the valley is lighter.
  float thickness = mix(1.0, 0.55, smoothstep(0.55, 0.95, p));

  // March only through the part of the ray that can hold fog.
  float t0 = max(cam.z - (top + heaps + 0.08), 0.0) / down;
  float t1 = (cam.z - land) / down;
  if (t1 <= t0) {
    outColor = vec4(0.0);
    return;
  }
  float stepLen = (t1 - t0) / float(STEPS);
  // Offset each pixel's first step (interleaved gradient noise, shifting every
  // frame) so the steps don't show as bands; the eye averages it away.
  vec2 dither = gl_FragCoord.xy + 5.588238 * mod(floor(uTime * 60.0), 64.0);
  float t = t0 + stepLen * fract(52.9829189 * fract(dot(dither, vec2(0.06711056, 0.00583715))));

  vec3 col = vec3(0.0);
  float transmittance = 1.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 pos = cam + rd * t;
    float d = fog(pos, top, heaps, sunk) * thickness;
    if (d > 0.003) {
      // Light from the sky reaches this point through the fog above it:
      // a close look for the lumps (self-shadowing), an estimate for the rest.
      float near = fog(pos + LIGHT_DIR * 0.06, top, heaps, sunk) * 0.06;
      float depth = max(top - pos.z, 0.0);
      float od = (near + depth / LIGHT_DIR.z * 0.6) * SIGMA * thickness;
      // light scattered many times inside keeps dense fog luminous, not grey
      float lit = (exp(-od) + 0.5 * exp(-od * 0.25) + 0.3 * exp(-od * 0.07)) / 1.8;
      // up high the cloud sees the open sky; down in the valley the hills shade it
      lit += 0.16 * smoothstep(0.3, 0.95, pos.z);
      vec3 light = mix(SHADE, LIT, min(lit, 1.0));
      float a = 1.0 - exp(-d * stepLen * SIGMA);
      col += transmittance * a * light;
      transmittance *= 1.0 - a;
      if (transmittance < 0.01) break;
    }
    t += stepLen;
  }
  // premultiplied: the page composites this over the photo
  outColor = vec4(col, 1.0 - transmittance);
}
`;
