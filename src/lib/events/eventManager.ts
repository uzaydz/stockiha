/**
 * Centralized event manager that wraps CustomEvent usage with light deduplication logic.
 * This helps prevent redundant re-emissions of the same payload across different modules.
 */

type EventListenerOptions = boolean | AddEventListenerOptions;

interface DispatchOptions {
  /**
   * Provide a custom dedupe key. Defaults to the event name.
   */
  dedupeKey?: string;
  /**
   * How long (in ms) to keep dedupe cache for this event.
   * Default: 1200ms.
   */
  dedupeWindowMs?: number;
  /**
   * Disable deduplication entirely for this dispatch.
   */
  disableDedupe?: boolean;
}

interface DedupeEntry {
  hash: string;
  timestamp: number;
}

const DEFAULT_DEDUPE_WINDOW = 1200;

const dedupeCache = new Map<string, DedupeEntry>();

const serializePayload = (value: unknown): string => {
  if (value === undefined) {
    return '__undefined__';
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    // Fallback to object reference string if serialization fails.
    return `__non_json__:${String((error as Error)?.message || 'unknown_error')}`;
  }
};

const shouldEmit = (
  key: string,
  payloadHash: string,
  windowMs: number
): boolean => {
  const existing = dedupeCache.get(key);
  if (!existing) {
    dedupeCache.set(key, { hash: payloadHash, timestamp: Date.now() });
    return true;
  }

  const now = Date.now();
  if (
    existing.hash === payloadHash &&
    now - existing.timestamp < windowMs
  ) {
    return false;
  }

  dedupeCache.set(key, { hash: payloadHash, timestamp: now });
  return true;
};

export const dispatchAppEvent = <TDetail = unknown>(
  eventName: string,
  detail?: TDetail,
  options: DispatchOptions = {}
): void => {
  if (typeof window === 'undefined') return;

  const { dedupeKey, dedupeWindowMs = DEFAULT_DEDUPE_WINDOW, disableDedupe } = options;
  const cacheKey = dedupeKey || eventName;

  const payloadHash = serializePayload(detail);

  if (!disableDedupe && !shouldEmit(cacheKey, payloadHash, dedupeWindowMs)) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<TDetail>(eventName, { detail })
  );
};

export const addAppEventListener = <TDetail = unknown>(
  eventName: string,
  handler: (detail: TDetail, rawEvent: CustomEvent<TDetail>) => void,
  options?: EventListenerOptions
): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const wrappedListener = (event: Event) => {
    const customEvent = event as CustomEvent<TDetail>;
    handler(customEvent.detail, customEvent);
  };

  window.addEventListener(eventName, wrappedListener, options);

  return () => {
    window.removeEventListener(eventName, wrappedListener, options);
  };
};

export const removeAppEventListener = (
  eventName: string,
  handler: EventListenerOrEventListenerObject,
  options?: EventListenerOptions
): void => {
  if (typeof window === 'undefined') return;
  window.removeEventListener(eventName, handler, options);
};
