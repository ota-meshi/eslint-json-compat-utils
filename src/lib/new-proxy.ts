/**
 * Create a new proxy object.
 */
export function newProxyWithProperties<T extends object>(
  target: T,
  properties: { [key in keyof T]?: unknown },
): T {
  return newProxyWithGet(target, (_target, prop) => {
    if (prop in properties) {
      return properties[prop as keyof T];
    }
    return Reflect.get(target, prop);
  });
}

/**
 * Create a new proxy object.
 */
export function newProxyWithGet<T extends object>(
  target: T,
  get: NonNullable<ProxyHandler<T>["get"]>,
): T {
  return new Proxy(
    Object.isFrozen(target) ? ({ __proto__: target } as T) : target,
    {
      get(t, p, r) {
        return proxyReflectValue(get(t, p, r), t, r);
      },
    },
  );
}

/**
 * Proxy the value.
 */
export function proxyReflectValue<T extends object, V extends T[keyof T]>(
  value: V,
  target: T,
  receiver: any,
): V {
  if (typeof value === "function") {
    return function (this: any, ...args: any[]) {
      // eslint-disable-next-line no-invalid-this, @typescript-eslint/no-this-alias -- OK
      const self = this;
      return value.apply(self === receiver ? target : self, args);
    } as typeof value;
  }
  return value;
}
