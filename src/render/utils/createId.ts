export function createId(): number {
  return Math.random() * 0x7FFFFFFF | 0;
}
