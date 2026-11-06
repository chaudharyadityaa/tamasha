/**
 * Adds prices exactly by working in the smallest currency unit (paise or cents) and dividing at the end,
 * so 0.1 + 0.2 never shows up as 0.30000000000000004. This is only a preview: the server calculates the real total.
 */
export function sumLines(lines: { price: number; quantity: number }[]): number {
  const minorUnits = lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0)
  return minorUnits / 100
}