export function popAt<T>(arr: T[], index: number) {
  return arr.filter((_, i) => i !== index);
}
