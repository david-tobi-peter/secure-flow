/* eslint-disable @typescript-eslint/no-explicit-any */

/** Marks a class as a controller and auto-binds all its methods to instances. */
export function Controller<T extends object>(target: new (...args: any[]) => T): void {
  const { prototype } = target;
  for (const key of Object.getOwnPropertyNames(prototype)) {
    if (key === "constructor") {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
    if (!descriptor || typeof descriptor.value !== "function") {
      continue;
    }
    const original = descriptor.value as (...args: unknown[]) => unknown;
    Object.defineProperty(prototype, key, {
      configurable: true,
      enumerable: false,
      get() {
        const bound = original.bind(this);
        Object.defineProperty(this, key, {
          value: bound,
          configurable: true,
          writable: true,
        });
        return bound;
      },
    });
  }
}
