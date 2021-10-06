export function getHashCode(
  hashCodes: number[],
): number {
  let value = 0;
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < hashCodes.length; i += 1) {
    value = value * 7 + (hashCodes[i] ?? 0);
  }
  return value;
}
