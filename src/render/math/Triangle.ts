import { Vector3 } from './Vector3.js';

const _v0 = /*@__PURE__*/ new Vector3();
const _v1 = /*@__PURE__*/ new Vector3();
const _v2 = /*@__PURE__*/ new Vector3();
const _v3 = /*@__PURE__*/ new Vector3();

const _vab = /*@__PURE__*/ new Vector3();
const _vac = /*@__PURE__*/ new Vector3();
const _vbc = /*@__PURE__*/ new Vector3();
const _vap = /*@__PURE__*/ new Vector3();
const _vbp = /*@__PURE__*/ new Vector3();
const _vcp = /*@__PURE__*/ new Vector3();

class Triangle {
    a: Vector3;
    b: Vector3;
    c: Vector3;

    constructor(a: Vector3 = new Vector3(), b: Vector3 = new Vector3(), c: Vector3 = new Vector3()) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    static getNormal(a: Vector3, b: Vector3, c: Vector3, target: Vector3): Vector3 {
        target.subVectors(c, b);
        _v0.subVectors(a, b);
        target.cross(_v0);

        const targetLengthSq = target.lengthSq();
        if (targetLengthSq > 0) {
            return target.multiplyScalar(1 / Math.sqrt(targetLengthSq));
        }

        return target.set(0, 0, 0);
    }

    static getBarycoord(
        point: Vector3,
        a: Vector3,
        b: Vector3,
        c: Vector3,
        target: Vector3
    ): Vector3 {
        _v0.subVectors(c, a);
        _v1.subVectors(b, a);
        _v2.subVectors(point, a);

        const dot00 = _v0.dot(_v0);
        const dot01 = _v0.dot(_v1);
        const dot02 = _v0.dot(_v2);
        const dot11 = _v1.dot(_v1);
        const dot12 = _v1.dot(_v2);

        const denom = dot00 * dot11 - dot01 * dot01;

        if (denom === 0) {
            return target.set(-2, -1, -1);
        }

        const invDenom = 1 / denom;
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

        return target.set(1 - u - v, v, u);
    }

    static containsPoint(point: Vector3, a: Vector3, b: Vector3, c: Vector3): boolean {
        this.getBarycoord(point, a, b, c, _v3);

        return _v3.x >= 0 && _v3.y >= 0 && _v3.x + _v3.y <= 1;
    }

    static getUV(
        point: Vector3,
        p1: Vector3,
        p2: Vector3,
        p3: Vector3,
        uv1: Vector3,
        uv2: Vector3,
        uv3: Vector3,
        target: Vector3
    ): Vector3 {
        this.getBarycoord(point, p1, p2, p3, _v3);

        target.set(0, 0, 0);
        target.addScaledVector(uv1, _v3.x);
        target.addScaledVector(uv2, _v3.y);
        target.addScaledVector(uv3, _v3.z);

        return target;
    }

    static isFrontFacing(a: Vector3, b: Vector3, c: Vector3, direction: Vector3): boolean {
        _v0.subVectors(c, b);
        _v1.subVectors(a, b);

        return _v0.cross(_v1).dot(direction) < 0;
    }

    set(a: Vector3, b: Vector3, c: Vector3): this {
        this.a.copy(a);
        this.b.copy(b);
        this.c.copy(c);

        return this;
    }

    setFromPointsAndIndices(points: Vector3[], i0: number, i1: number, i2: number): this {
        this.a.copy(points[i0]);
        this.b.copy(points[i1]);
        this.c.copy(points[i2]);

        return this;
    }

    setFromAttributeAndIndices(
        attribute: any,
        i0: number,
        i1: number,
        i2: number
    ): this {
        this.a.fromBufferAttribute(attribute, i0);
        this.b.fromBufferAttribute(attribute, i1);
        this.c.fromBufferAttribute(attribute, i2);

        return this;
    }

    clone(): Triangle {
        return new Triangle().copy(this);
    }

    copy(triangle: Triangle): this {
        this.a.copy(triangle.a);
        this.b.copy(triangle.b);
        this.c.copy(triangle.c);

        return this;
    }

    getArea(): number {
        _v0.subVectors(this.c, this.b);
        _v1.subVectors(this.a, this.b);

        return _v0.cross(_v1).length() * 0.5;
    }

    getMidpoint(target: Vector3): Vector3 {
        return target
            .addVectors(this.a, this.b)
            .add(this.c)
            .multiplyScalar(1 / 3);
    }

    getNormal(target: Vector3): Vector3 {
        return Triangle.getNormal(this.a, this.b, this.c, target);
    }
    getBarycoord(point: Vector3, target: Vector3): Vector3 {
        return Triangle.getBarycoord(point, this.a, this.b, this.c, target);
    }

    getUV(
        point: Vector3,
        uv1: Vector3,
        uv2: Vector3,
        uv3: Vector3,
        target: Vector3
    ): Vector3 {
        return Triangle.getUV(point, this.a, this.b, this.c, uv1, uv2, uv3, target);
    }

    containsPoint(point: Vector3): boolean {
        return Triangle.containsPoint(point, this.a, this.b, this.c);
    }

    isFrontFacing(direction: Vector3): boolean {
        return Triangle.isFrontFacing(this.a, this.b, this.c, direction);
    }

  closestPointToPoint(p: Vector3, target: Vector3): Vector3 {
    const _vab = new Vector3();
    const _vac = new Vector3();
    const _vap = new Vector3();
    const _vbp = new Vector3();
    const _vcp = new Vector3();
    const _vbc = new Vector3();

    const a = this.a, b = this.b, c = this.c;
    let v, w;

    _vab.subVectors(b, a);
    _vac.subVectors(c, a);
    _vap.subVectors(p, a);
    const d1 = _vab.dot(_vap);
    const d2 = _vac.dot(_vap);
    if (d1 <= 0 && d2 <= 0) {
      return target.copy(a);
    }

    _vbp.subVectors(p, b);
    const d3 = _vab.dot(_vbp);
    const d4 = _vac.dot(_vbp);
    if (d3 >= 0 && d4 <= d3) {
      return target.copy(b);
    }

    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      v = d1 / (d1 - d3);
      return target.copy(a).addScaledVector(_vab, v);
    }

    _vcp.subVectors(p, c);
    const d5 = _vab.dot(_vcp);
    const d6 = _vac.dot(_vcp);
    if (d6 >= 0 && d5 <= d6) {
      return target.copy(c);
    }

    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      w = d2 / (d2 - d6);
      return target.copy(a).addScaledVector(_vac, w);
    }

    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
      _vbc.subVectors(c, b);
      w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
      return target.copy(b).addScaledVector(_vbc, w);
    }

    const denom = 1 / (va + vb + vc);
    v = vb * denom;
    w = vc * denom;

    return target.copy(a).addScaledVector(_vab, v).addScaledVector(_vac, w);
  }

  equals(triangle: Triangle): boolean {
    return triangle.a.equals(this.a) && triangle.b.equals(this.b) && triangle.c.equals(this.c);
  }
}

export { Triangle };