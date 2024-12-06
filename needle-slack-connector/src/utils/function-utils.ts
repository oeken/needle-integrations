// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FunctionWithReturn<T> = (...args: any[]) => T;

export function debounce<T>(func: FunctionWithReturn<T>, delay: number) {
  let timeout: number;
  return function debouncedFunction(...args: unknown[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay) as unknown as number;
  };
}
