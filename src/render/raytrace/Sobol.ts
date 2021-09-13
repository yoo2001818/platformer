const BITS = 52;
const SCALE = 2 << 51;

const dimensionTable: [number, number[]][] = [
  [0, [0, 1]],
  [1, [0, 1, 3]],
  [1, [0, 1, 3, 1]],
  [2, [0, 1, 1, 1]],
  [1, [0, 1, 1, 3, 3]],
  [4, [0, 1, 3, 5, 13]],
  [2, [0, 1, 1, 5, 5, 17]],
  [4, [0, 1, 1, 5, 5, 5]],
  [7, [0, 1, 1, 7, 11, 19]],
  [11, [0, 1, 1, 5, 1, 1]],
  [13, [0, 1, 1, 1, 3, 11]],
  [14, [0, 1, 3, 5, 5, 31]],
  [1, [0, 1, 3, 3, 9, 7, 49]],
  [13, [0, 1, 1, 1, 15, 21, 21]],
  [16, [0, 1, 3, 1, 13, 27, 49]],
];

// https://github.com/croquelois/sobol
export class Sobol {
  dimensions: number;
  count!: number;
  direction!: number[][];
  x!: number[];
  zero!: number[];

  constructor(dimensions: number) {
    if (dimensions < 2 || dimensions > dimensionTable.length + 1) {
      throw new Error('Unsupported dimensions');
    }
    this.dimensions = dimensions;
    this.reset();
  }

  reset(): void {
    this.count = 0;
    this.direction = [];
    this.x = [];
    this.zero = [];
    const tmpBits = [];
    for (let i = 0; i <= BITS; i += 1) {
      tmpBits.push(i);
    }
    for (let i = 0; i < this.dimensions; i += 1) {
      this.direction[i] = tmpBits.slice();
      this.x[i] = 0;
      this.zero[i] = 0;
    }
    for (let i = 1; i <= BITS; i += 1) {
      this.direction[0][i] = 1 << (BITS - i);
    }
    const direction = this.direction;
    for (let d = 1; d < this.dimensions; d += 1) {
      const [a, m] = dimensionTable[d - 1];
      const s = m.length - 1;
      for (let i = 1; i <= s; i += 1) {
        direction[d][i] = m[i] << (BITS - i);
      }
      for (let i = s + 1; i <= BITS; i += 1) {
        direction[d][i] = direction[d][i - s] ^ (direction[d][i - s] >> s);
        for (let k = 1; k <= s - 1; k += 1) {
          direction[d][i] ^= ((a >> (s - 1 - k)) & 1) * direction[d][i - k];
        }
      }
    }
    console.log(this.direction);
  }

  next(): number[] {
    const v: number[] = [];
    if (this.count === 0) {
      this.count += 1;
      return this.zero;
    }
    let c = 1;
    let value = this.count - 1;
    while ((value & 1) === 1) {
      value >>= 1;
      c += 1;
    }
    for (let i = 0; i < this.dimensions; i += 1) {
      this.x[i] ^= this.direction[i][c];
      v[i] = this.x[i] / SCALE;
    }
    this.count += 1;
    return v;
  }
}
