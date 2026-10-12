// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const GL_VERTEX_SHADER = 35633;
const GL_FRAGMENT_SHADER = 35632;

export class ShaderProgramPool {
  private gl: WebGL2RenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();
  private uniformLocations: Map<string, Map<string, WebGLUniformLocation>> = new Map();

  static SOLID_COLOR_VS = `#version 300 es
in vec2 a_position;
uniform mat3 u_matrix;
void main() {
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, pos.z);
}`;

  static SOLID_COLOR_FS = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 fragColor;
void main() {
  fragColor = u_color;
}`;

  static GRADIENT_VS = `#version 300 es
in vec2 a_position;
uniform mat3 u_matrix;
out vec2 v_position;
void main() {
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, pos.z);
  v_position = a_position;
}`;

  static GRADIENT_FS = `#version 300 es
precision highp float;
in vec2 v_position;
uniform int u_gradientType;
uniform int u_stopCount;
uniform float u_stops[16];
uniform vec4 u_colors[16];
uniform vec2 u_startPoint;
uniform vec2 u_endPoint;
uniform float u_radius;
uniform vec2 u_center;
out vec4 fragColor;

vec4 linearGradient(vec2 pos) {
  vec2 dir = u_endPoint - u_startPoint;
  float t = dot(pos - u_startPoint, dir) / dot(dir, dir);
  t = clamp(t, 0.0, 1.0);
  for (int i = 0; i < 15; i++) {
    if (i >= u_stopCount - 1) break;
    if (t >= u_stops[i] && t <= u_stops[i + 1]) {
      float s = (t - u_stops[i]) / (u_stops[i + 1] - u_stops[i]);
      return mix(u_colors[i], u_colors[i + 1], s);
    }
  }
  return u_colors[0];
}

vec4 radialGradient(vec2 pos) {
  float d = distance(pos, u_center) / u_radius;
  d = clamp(d, 0.0, 1.0);
  for (int i = 0; i < 15; i++) {
    if (i >= u_stopCount - 1) break;
    if (d >= u_stops[i] && d <= u_stops[i + 1]) {
      float s = (d - u_stops[i]) / (u_stops[i + 1] - u_stops[i]);
      return mix(u_colors[i], u_colors[i + 1], s);
    }
  }
  return u_colors[0];
}

void main() {
  if (u_gradientType == 0) {
    fragColor = linearGradient(v_position);
  } else {
    fragColor = radialGradient(v_position);
  }
}`;

  static ROUNDED_RECT_VS = `#version 300 es
in vec2 a_position;
uniform mat3 u_matrix;
out vec2 v_position;
void main() {
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, pos.z);
  v_position = a_position;
}`;

  static ROUNDED_RECT_FS = `#version 300 es
precision highp float;
in vec2 v_position;
uniform vec2 u_size;
uniform vec4 u_radius;
uniform vec4 u_color;
out vec4 fragColor;

float sdRoundedBox(vec2 p, vec2 b, vec4 r) {
  r.xy = (p.x > 0.0) ? r.xy : r.zw;
  r.x = (p.y > 0.0) ? r.x : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

void main() {
  vec2 p = v_position - u_size * 0.5;
  float d = sdRoundedBox(p, u_size * 0.5, u_radius);
  float alpha = 1.0 - smoothstep(-1.0, 1.0, d);
  fragColor = u_color * alpha;
}`;

  static TEXTURED_VS = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
uniform mat3 u_matrix;
out vec2 v_texCoord;
void main() {
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, pos.z);
  v_texCoord = a_texCoord;
}`;

  static TEXTURED_FS = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;
void main() {
  fragColor = texture(u_texture, v_texCoord);
}`;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  getProgram(name: string): WebGLProgram {
    return this.programs.get(name)!;
  }

  getUniformLocation(programName: string, uniformName: string): WebGLUniformLocation | null {
    const program = this.programs.get(programName);
    if (!program) return null;

    let locs = this.uniformLocations.get(programName);
    if (!locs) {
      locs = new Map();
      this.uniformLocations.set(programName, locs);
    }

    if (locs.has(uniformName)) {
      return locs.get(uniformName)!;
    }

    try {
      const location = this.gl.getUniformLocation(program, uniformName);
      if (location) {
        locs.set(uniformName, location);
      }
      return location;
    } catch {
      return null;
    }
  }

  compileShader(name: string, vertexSrc: string, fragmentSrc: string): WebGLProgram {
    try {
      const vertex = this.createShader(GL_VERTEX_SHADER, vertexSrc);
      if (!vertex) throw new Error('Vertex shader compilation failed');

      const fragment = this.createShader(GL_FRAGMENT_SHADER, fragmentSrc);
      if (!fragment) {
        this.gl.deleteShader(vertex);
        throw new Error('Fragment shader compilation failed');
      }

      const program = this.gl.createProgram();
      if (!program) {
        this.gl.deleteShader(vertex);
        this.gl.deleteShader(fragment);
        throw new Error('Program creation failed');
      }

      this.linkProgram(program, vertex, fragment);

      this.gl.deleteShader(vertex);
      this.gl.deleteShader(fragment);

      this.programs.set(name, program);
      return program;
    } catch {
      throw new Error(`Shader compilation failed for: ${name}`);
    }
  }

  createShader(type: number, source: string): WebGLShader | null {
    try {
      const shader = this.gl.createShader(type);
      if (!shader) return null;

      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);

      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        this.gl.deleteShader(shader);
        return null;
      }

      return shader;
    } catch {
      return null;
    }
  }

  linkProgram(program: WebGLProgram, vertex: WebGLShader, fragment: WebGLShader): void {
    this.gl.attachShader(program, vertex);
    this.gl.attachShader(program, fragment);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('Program linking failed');
    }
  }

  deleteProgram(name: string): void {
    try {
      const program = this.programs.get(name);
      if (program) {
        this.gl.deleteProgram(program);
        this.programs.delete(name);
        this.uniformLocations.delete(name);
      }
    } catch {
      /* empty */
    }
  }

  clear(): void {
    this.programs.forEach((program) => {
      try {
        this.gl.deleteProgram(program);
      } catch {
        /* empty */
      }
    });
    this.programs.clear();
    this.uniformLocations.clear();
  }

  getCompiledCount(): number {
    return this.programs.size;
  }
}