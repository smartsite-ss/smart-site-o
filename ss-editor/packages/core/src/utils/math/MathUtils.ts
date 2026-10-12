// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export class MathUtils {
  public static degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  public static radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  public static normaliseAngle(angle: number): number {
    let a = angle;
    while (a < 0) a += Math.PI * 2;
    while (a > Math.PI * 2) a -= Math.PI * 2;
    return a;
  }

  public static normalizeAngle(angle: number): number {
    return MathUtils.normaliseAngle(angle);
  }

  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}