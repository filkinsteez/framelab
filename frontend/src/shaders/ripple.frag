precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_rippleCenter;
uniform float u_rippleStartTime;
uniform sampler2D u_canvasTexture;

varying vec2 v_texCoord;

const float RIPPLE_SPEED = 2.0;
const float RIPPLE_AMPLITUDE = 0.015;
const float RIPPLE_FREQUENCY = 8.0;
const float RIPPLE_DURATION = 1.5;

void main() {
  vec2 uv = v_texCoord;
  
  // Calculate time since ripple started
  float rippleTime = u_time - u_rippleStartTime;
  
  // Only apply ripple if within duration
  if (rippleTime > 0.0 && rippleTime < RIPPLE_DURATION) {
    // Distance from ripple center (in normalized coordinates)
    vec2 center = u_rippleCenter / u_resolution;
    float dist = distance(uv, center);
    
    // Ripple expands outward
    float rippleRadius = rippleTime * RIPPLE_SPEED;
    
    // Calculate ripple intensity (fades with distance and time)
    float timeFade = 1.0 - (rippleTime / RIPPLE_DURATION);
    float distanceFade = smoothstep(rippleRadius + 0.1, rippleRadius, dist);
    float intensity = distanceFade * timeFade;
    
    // Wave oscillation
    float wave = sin((dist - rippleRadius) * RIPPLE_FREQUENCY * 3.14159);
    
    // Displace UV coordinates
    vec2 offset = normalize(uv - center) * wave * RIPPLE_AMPLITUDE * intensity;
    uv += offset;
  }
  
  // Sample the canvas texture with potentially displaced UVs
  vec4 color = texture2D(u_canvasTexture, uv);
  
  gl_FragColor = color;
}

