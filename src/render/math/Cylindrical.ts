/**
 * Ref: https://en.wikipedia.org/wiki/Cylindrical_coordinate_system
 */

class Cylindrical {
  radius: number;
  theta: number;
  y: number;

  constructor(radius = 1, theta = 0, y = 0) {
    this.radius = radius; // distance from the origin to a point in the x-z plane
    this.theta = theta; // counterclockwise angle in the x-z plane measured in radians from the positive z-axis
    this.y = y; // height above the x-z plane
  }

  set(radius: number, theta: number, y: number): this {
    this.radius = radius;
    this.theta = theta;
    this.y = y;
    return this;
  }

  copy(other: Cylindrical): this {
    this.radius = other.radius;
    this.theta = other.theta;
    this.y = other.y;
    return this;
  }

  setFromVector3(v: { x: number; y: number; z: number }): this {
    return this.setFromCartesianCoords(v.x, v.y, v.z);
  }

  setFromCartesianCoords(x: number, y: number, z: number): this {
    this.radius = Math.sqrt(x * x + z * z);
    this.theta = Math.atan2(x, z);
    this.y = y;
    return this;
  }

  clone(): Cylindrical {
    return new Cylindrical().copy(this);
  }
}

export { Cylindrical };