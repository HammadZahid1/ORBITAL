import type { Vec3 } from '../types/vector';

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function clone3(a: Readonly<Vec3>): Vec3 {
  return { x: a.x, y: a.y, z: a.z };
}

export function add3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale3(a: Readonly<Vec3>, scalar: number): Vec3 {
  return { x: a.x * scalar, y: a.y * scalar, z: a.z * scalar };
}

export function dot3(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length3(a: Readonly<Vec3>): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function lengthSq3(a: Readonly<Vec3>): number {
  return a.x * a.x + a.y * a.y + a.z * a.z;
}

export function distance3(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return length3(sub3(a, b));
}

export function normalize3(a: Readonly<Vec3>): Vec3 {
  const length = length3(a);
  return length > 0 ? scale3(a, 1 / length) : vec3();
}

export function lerp3(a: Readonly<Vec3>, b: Readonly<Vec3>, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function negate3(a: Readonly<Vec3>): Vec3 {
  return { x: -a.x, y: -a.y, z: -a.z };
}
