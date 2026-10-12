// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

declare module 'three' {
  export class Scene {
    add(object: any): void;
  }

  export class PerspectiveCamera {
    aspect: number;
    position: { set(x: number, y: number, z: number): void };
    lookAt(x: number, y: number, z: number): void;
    updateProjectionMatrix(): void;
    constructor(fov: number, aspect: number, near: number, far: number);
  }

  export class AmbientLight {
    constructor(color: number, intensity: number);
  }

  export class DirectionalLight {
    position: { set(x: number, y: number, z: number): void };
    constructor(color: number, intensity: number);
  }

  export class Color {
    constructor(hex: string);
  }

  export class MeshStandardMaterial {
    constructor(params: Record<string, any>);
  }

  export class BoxGeometry {
    constructor(width: number, height: number, depth: number);
  }

  export class Mesh {
    rotation: { x: number; y: number; z: number };
    constructor(geometry: any, material: any);
  }

  export class GridHelper {
    constructor(size: number, divisions: number, colorCenterLine: number, colorGrid: number);
  }

  export class AxesHelper {
    constructor(size: number);
  }
}