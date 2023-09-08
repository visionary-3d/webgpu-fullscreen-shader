import { Vector3 } from './Vector3.js';
import { Sphere } from './Sphere.js';
import { Plane } from './Plane.js';

const _sphere = /*@__PURE__*/ new Sphere();
const _vector = /*@__PURE__*/ new Vector3();

class Frustum {
  planes: Plane[];

  constructor(
    p0 = new Plane(),
    p1 = new Plane(),
    p2 = new Plane(),
    p3 = new Plane(),
    p4 = new Plane(),
    p5 = new Plane()
  ) {
    this.planes = [p0, p1, p2, p3, p4, p5];
  }

  set(
    p0: Plane,
    p1: Plane,
    p2: Plane,
    p3: Plane,
    p4: Plane,
    p5: Plane
  ): this {
    const planes = this.planes;
    planes[0].copy(p0);
    planes[1].copy(p1);
    planes[2].copy(p2);
    planes[3].copy(p3);
    planes[4].copy(p4);
    planes[5].copy(p5);
    return this;
  }

  copy(frustum: Frustum): this {
    const planes = this.planes;
    for (let i = 0; i < 6; i++) {
      planes[i].copy(frustum.planes[i]);
    }
    return this;
  }

  setFromProjectionMatrix(m: { elements: number[] }): this {
    const planes = this.planes;
    const me = m.elements;
    const me0 = me[0],
      me1 = me[1],
      me2 = me[2],
      me3 = me[3];
    const me4 = me[4],
      me5 = me[5],
      me6 = me[6],
      me7 = me[7];
    const me8 = me[8],
      me9 = me[9],
      me10 = me[10],
      me11 = me[11];
    const me12 = me[12],
      me13 = me[13],
      me14 = me[14],
      me15 = me[15];

    planes[0]
      .setComponents(
        me3 - me0,
        me7 - me4,
        me11 - me8,
        me15 - me12
      )
      .normalize();
    planes[1]
      .setComponents(
        me3 + me0,
        me7 + me4,
        me11 + me8,
        me15 + me12
      )
      .normalize();
    planes[2]
      .setComponents(
        me3 + me1,
        me7 + me5,
        me11 + me9,
        me15 + me13
      )
      .normalize();
    planes[3]
      .setComponents(
        me3 - me1,
        me7 - me5,
        me11 - me9,
        me15 - me13
      )
      .normalize();
    planes[4]
      .setComponents(
        me3 - me2,
        me7 - me6,
        me11 - me10,
        me15 - me14
      )
      .normalize();
    planes[5]
      .setComponents(
        me3 + me2,
        me7 + me6,
        me11 + me10,
        me15 + me14
      )
      .normalize();

    return this;
  }

  intersectsObject(object: { geometry: { boundingSphere: Sphere }; matrixWorld: any }): boolean {
    const geometry = object.geometry;
    _sphere.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld);
    return this.intersectsSphere(_sphere);
  }

  intersectsSprite(sprite: { matrixWorld: any }): boolean {
    _sphere.center.set(0, 0, 0);
    _sphere.radius = 0.7071067811865476;
    _sphere.applyMatrix4(sprite.matrixWorld);
    return this.intersectsSphere(_sphere);
  }

  intersectsSphere(sphere: Sphere): boolean {
    const planes = this.planes;
    const center = sphere.center;
    const negRadius = -sphere.radius;
    for (let i = 0; i < 6; i++) {
      const distance = planes[i].distanceToPoint(center);
      if (distance < negRadius) {
        return false;
      }
    }
    return true;
  }

  intersectsBox(box: { min: Vector3; max: Vector3 }): boolean {
    const planes = this.planes;
    for (let i = 0; i < 6; i++) {
      const plane = planes[i];
      // corner at max distance
      _vector.x = plane.normal.x > 0 ? box.max.x : box.min.x;
      _vector.y = plane.normal.y > 0 ? box.max.y : box.min.y;
      _vector.z = plane.normal.z > 0 ? box.max.z : box.min.z;
      if (plane.distanceToPoint(_vector) < 0) {
        return false;
      }
    }
    return true;
  }

  containsPoint(point: Vector3): boolean {
    const planes = this.planes;
    for (let i = 0; i < 6; i++) {
      if (planes[i].distanceToPoint(point) < 0) {
        return false;
      }
    }
    return true;
  }

  clone(): Frustum {
    return new Frustum().copy(this);
  }
}

export { Frustum };