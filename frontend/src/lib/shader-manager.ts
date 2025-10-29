import vertexShaderSource from '../shaders/ripple.vert?raw';
import fragmentShaderSource from '../shaders/ripple.frag?raw';

interface RippleEffect {
  centerX: number;
  centerY: number;
  startTime: number;
}

/**
 * Manages WebGL overlay for shader effects on the canvas
 */
export class ShaderManager {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private activeRipples: RippleEffect[] = [];
  private animationFrameId: number | null = null;
  
  // Uniform locations
  private uniforms: {
    resolution?: WebGLUniformLocation | null;
    time?: WebGLUniformLocation | null;
    rippleCenter?: WebGLUniformLocation | null;
    rippleStartTime?: WebGLUniformLocation | null;
    canvasTexture?: WebGLUniformLocation | null;
  } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { 
      alpha: true, 
      premultipliedAlpha: false 
    });
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl;
    this.initialize();
  }

  private initialize() {
    const gl = this.gl;

    // Create shaders
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }

    // Create program
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Program link failed: ${info}`);
    }

    this.program = program;

    // Get uniform locations
    this.uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      rippleCenter: gl.getUniformLocation(program, 'u_rippleCenter'),
      rippleStartTime: gl.getUniformLocation(program, 'u_rippleStartTime'),
      canvasTexture: gl.getUniformLocation(program, 'u_canvasTexture'),
    };

    // Set up position buffer (full screen quad)
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set up texture coordinate buffer
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      console.error(`Shader compile failed: ${info}`);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Trigger a ripple effect at the given position
   */
  triggerRipple(x: number, y: number) {
    this.activeRipples.push({
      centerX: x,
      centerY: y,
      startTime: performance.now() / 1000,
    });

    // Start animation loop if not already running
    if (!this.animationFrameId) {
      this.startAnimation();
    }
  }

  private startAnimation() {
    const animate = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(animate);

      // Clean up old ripples
      const currentTime = performance.now() / 1000;
      this.activeRipples = this.activeRipples.filter(
        ripple => currentTime - ripple.startTime < 1.5
      );

      // Stop animation if no active ripples
      if (this.activeRipples.length === 0 && this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    };

    animate();
  }

  /**
   * Render the shader overlay
   */
  render() {
    const gl = this.gl;
    
    if (!this.program) return;

    // Resize canvas if needed
    if (this.canvas.width !== this.canvas.clientWidth ||
        this.canvas.height !== this.canvas.clientHeight) {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set uniforms
    if (this.uniforms.resolution) {
      gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    }

    if (this.uniforms.time) {
      gl.uniform1f(this.uniforms.time, performance.now() / 1000);
    }

    // Use most recent ripple for simplicity (can be enhanced to support multiple)
    if (this.activeRipples.length > 0) {
      const ripple = this.activeRipples[this.activeRipples.length - 1];
      
      if (this.uniforms.rippleCenter) {
        gl.uniform2f(this.uniforms.rippleCenter, ripple.centerX, ripple.centerY);
      }
      
      if (this.uniforms.rippleStartTime) {
        gl.uniform1f(this.uniforms.rippleStartTime, ripple.startTime);
      }
    }

    // Draw the quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    const gl = this.gl;
    
    if (this.program) {
      gl.deleteProgram(this.program);
    }
  }

  /**
   * Resize the canvas
   */
  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }
}

