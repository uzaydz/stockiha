/**
 * Lightweight stream polyfill used by Supabase bundles in the browser.
 * Only a very small subset of the Node stream API is required.
 */

export class Readable {
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};

  static from(): Readable {
    return new Readable();
  }

  pipe(): this {
    return this;
  }

  on(event: string, handler: (...args: any[]) => void): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    return this;
  }

  emit(event: string, ...args: any[]): void {
    this.listeners[event]?.forEach((listener) => listener(...args));
  }
}

export class PassThrough extends Readable {}

export function pipeline<T>(stream: T, ...rest: any[]): T {
  const maybeCallback = rest[rest.length - 1];
  if (typeof maybeCallback === 'function') {
    try {
      maybeCallback(null);
    } catch {
      // ignore callback errors – this is a noop polyfill
    }
  }
  return stream;
}

const streamPolyfill = {
  Readable,
  PassThrough,
  pipeline,
};

export default streamPolyfill;
