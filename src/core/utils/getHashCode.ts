export function getHashCode(
  hashCodes: number[],
): number {
  let value = 0;
  for (const hashCode of hashCodes) {
    value = value * 7 + hashCode;
  }
  return value;
}
