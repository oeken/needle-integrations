export function popAt<T>(arr: T[], index: number) {
  return arr.filter((_, i) => i !== index);
}


export function equals<T>(arr1: T[], arr2: T[]) {
  return arr1.length === arr2.length && arr1.every((v1, i1) => v1 === arr2[i1]);
}