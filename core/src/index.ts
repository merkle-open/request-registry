import { load, recursiveLoader } from "./lib/ajax";
import { Emitter } from "./lib/Emitter";
export { ERROR_EMITTER } from "./lib/errorHandler";

import { AjaxError as AjaxErrorType } from "./lib/errorHandler";
export type AjaxError = AjaxErrorType;

export interface EndpointGetOptions<TKeys, TResult, TKeysBind = TKeys> {
  url: (keys: TKeysBind) => string;
  headers?: { [keys: string]: (keys: TKeysBind) => string };
  /**
   * Wether to cache the request - true by default
   */
  cacheRequest?: boolean;
  /**
   * A cache store
   */
  cache?: Cache<TResult>;
  /**
   * A function which returns false if the cache is invalid
   */
  cacheValidator?: (api: EndpointGetFunction<TKeysBind, TResult>) => boolean;
  /**
   * A custom loader
   */
  loader?: (
    keys: TKeys,
    url: string,
    headers: { [key: string]: string }
  ) => Promise<TResult>;
  /**
   * Success handler
   */
  afterSuccess?: (result: TResult) => any;
  /**
   * Error handler
   */
  afterError?: (result: Response) => any;
}

/**
 * Options for POST | PUT  Endpoints
 */
export interface EndpointWithRequestBodyOptions<
  TKeys,
  TBody,
  TResult,
  TKeysBind = TKeys
> {
  url: (keys: TKeysBind) => string;
  headers?: { [keys: string]: (keys: TKeysBind) => string };
  /**
   * A custom loader
   */
  loader?: (
    keys: TKeys,
    url: string,
    headers: { [key: string]: string },
    body: TBody
  ) => Promise<TResult>;
  /**
   * Success handler
   */
  afterSuccess?: (result: TResult) => any;
  /**
   * Error handler
   */
  afterError?: (result: Response) => any;
}

export interface EndpointDeleteOptions<TKeys, TResult, TKeysBind = TKeys> {
  url: (keys: TKeysBind) => string;
  headers?: { [keys: string]: (keys: TKeysBind) => string };
  /**
   * A custom loader
   */
  loader?: (
    keys: TKeys,
    url: string,
    headers: { [key: string]: string }
  ) => Promise<TResult>;
  /**
   * Success handler
   */
  afterSuccess?: (result: TResult) => any;
  /**
   * Error handler
   */
  afterError?: (result: Response) => any;
}

export interface EndpointGetFunction<
  TKeys extends {},
  TResult extends unknown
> {
  (keys: TKeys): Promise<TResult>;
  /**
   * The loader without caching
   */
  loader: (
    keys: TKeys,
    url: string,
    headers: { [key: string]: string }
  ) => Promise<TResult>;
  /**
   * Clear the cache for this url
   */
  clearCache: () => void;
  /**
   * Cache Key
   */
  getCacheKey: (keys: TKeys) => string;
  /**
   * The time of the first write into the cache
   * will be reset on clearCache
   */
  cacheCreation: Date | undefined;
  /**
   * Helper to prevent memory leaks
   *
   * Returns a clear cache function for the given keys
   * Once all clear cache functions for the given keys have been
   * called the memory is freed after a timeout of 20s
   */
  keepInCache: (keys: TKeys) => () => void;
  /**
   * Bind to cache clear events - returns a dispose function
   */
  on: (
    eventName: "cacheClear",
    callback: (previousCacheCreation: Date) => void
  ) => () => void;
  /**
   * Unbind from cache clear events
   */
  off: (
    eventName: "cacheClear",
    callback?: (previousCacheCreation: Date) => void
  ) => void;
  /** Endpoint Method */
  readonly method: "GET";
}

export interface EndpointWithRequestBodyFunction<
  TKeys,
  TBody,
  TResult,
  TMethod extends "POST" | "PUT"
> {
  (keys: TKeys, body: TBody): Promise<TResult>;
  /**
   * The loader without caching
   */
  loader: (
    keys: TKeys,
    url: string,
    headers: { [key: string]: string },
    body: TBody
  ) => Promise<TResult>;
  /** Endpoint Method */
  readonly method: TMethod;
}

export interface EndpointPostFunction<TKeys, TBody, TResult>
  extends EndpointWithRequestBodyFunction<TKeys, TBody, TResult, "POST"> {}

export interface EndpointPutFunction<TKeys, TBody, TResult>
  extends EndpointWithRequestBodyFunction<TKeys, TBody, TResult, "PUT"> {}

export interface EndpointDeleteFunction<TKeys, TResult> {
  (keys: TKeys): Promise<TResult>;
  /**
   * The loader without caching
   */
  loader: (
    keys: TKeys,
    url: string,
    headers: { [key: string]: string }
  ) => Promise<TResult>;
  /** Endpoint Method */
  readonly method: "DELETE";
}

export type Cachable<T = string> = { cacheKey: string; value: T };

interface Cache<TResult> {
  get(cacheKey: string): Promise<TResult> | undefined;
  set(cacheKey: string, value: Promise<TResult>): any;
  delete(cacheKey: string): void;
  clear(): void;
}

function createLoader<TKeys, TResult>(
  options:
    | EndpointGetOptions<TKeys, TResult>
    | EndpointDeleteOptions<TKeys, TResult>,
  method: "GET" | "DELETE"
): (
  keys: TKeys,
  url: string,
  headers: { [key: string]: string }
) => Promise<TResult>;
function createLoader<TKeys, TBody, TResult>(
  options: EndpointWithRequestBodyOptions<TKeys, TBody, TResult>,
  method: "POST" | "PUT"
): (
  keys: TKeys,
  url: string,
  headers: { [key: string]: string },
  body: TBody
) => Promise<TResult>;
function createLoader<TKeys, TBody, TResult>(
  options:
    | EndpointWithRequestBodyOptions<TKeys, TBody, TResult>
    | EndpointGetOptions<TKeys, TResult>
    | EndpointDeleteOptions<TKeys, TResult>,
  method: "POST" | "PUT" | "GET" | "DELETE"
) {
  const loader =
    options.loader ||
    ((keys, url, headers, body): Promise<TResult> => {
      // Execute request
      const ajaxReponsePromise = recursiveLoader(
        load,
        url,
        method,
        headers,
        body
      );
      const ajaxResultPromise = ajaxReponsePromise
        .then(response => {
          if (!response.ok) {
            throw new Error(
              `Unexpected status ${response.status} - "${response.statusText}".`
            );
          }
          return response.clone().text();
        })
        .then(result => JSON.parse(result)) as Promise<TResult>;

      return ajaxResultPromise;
    });
  return loader;
}

/**
 * Factory for endpoints sending a data body (POST|PUT)
 */
function createWithRequestBodyEndpoint<
  TKeys,
  TBody,
  TResult,
  TMethod extends "POST" | "PUT"
>(
  method: TMethod,
  options: EndpointWithRequestBodyOptions<TKeys, TBody, TResult>
) {
  const headerTemplate = options.headers || {};
  const headerKeys: Array<keyof typeof headerTemplate> = Object.keys(
    headerTemplate
  );
  const loader = createLoader<TKeys, TBody, TResult>(options, method);
  /**
   * Data loader
   */
  const api: EndpointWithRequestBodyFunction<
    TKeys,
    TBody,
    TResult,
    TMethod
  > = Object.assign(
    function transmitFunction(keys: TKeys, body: TBody) {
      const url = getUrl(keys, options.url);
      const headers = getHeaders(keys, headerTemplate, headerKeys);
      // Set default Content-Type header,
      // otherwise overwrite it with the one passed in by the config
      headers.value = Object.assign(
        {
          "Content-Type": "application/json"
        },
        headers.value
      );
      // Execute request
      const ajaxResultPromise = api.loader(
        keys,
        url.value,
        headers.value,
        body
      );
      // Fire handlers
      return ajaxResultPromise
        .then(
          ajaxResult =>
            options.afterSuccess && options.afterSuccess(ajaxResult),
          error => options.afterError && options.afterError(error)
        )
        .then(() => ajaxResultPromise);
    },
    {
      loader,
      method
    }
  );
  return api;
}

export function createPostEndpoint<TKeys, TBody, TResult = undefined>(
  options: EndpointWithRequestBodyOptions<TKeys, TBody, TResult>
): EndpointPostFunction<TKeys, TBody, TResult> {
  return createWithRequestBodyEndpoint<TKeys, TBody, TResult, "POST">(
    "POST",
    options
  );
}

export function createPutEndpoint<TKeys, TBody, TResult = undefined>(
  options: EndpointWithRequestBodyOptions<TKeys, TBody, TResult>
): EndpointPutFunction<TKeys, TBody, TResult> {
  return createWithRequestBodyEndpoint<TKeys, TBody, TResult, "PUT">(
    "PUT",
    options
  );
}

export function createGetEndpoint<TKeys, TResult>(
  options: EndpointGetOptions<TKeys, TResult>
): EndpointGetFunction<TKeys, TResult> {
  const loader = createLoader<TKeys, TResult>(options, "GET");
  /** Some requests require special headers like auth tokens */
  const headerTemplate = options.headers || {};
  const headerKeys: Array<keyof typeof headerTemplate> = Object.keys(
    headerTemplate
  );
  /** Helper map to track which CacheKeys can be garbage collected */
  const keepInCacheTracker = new Map<
    /** CacheKey */ string,
    {
      /** The amount of cache consumers for the given CacheKey */
      count: number;
      /** The setTimeout to cleanup the given cache once all consumers are gone */
      timeout?: number;
    }
  >();
  const cache: Cache<TResult> =
    options.cache || new Map<string, Promise<TResult>>();
  const emitter = new Emitter<{
    cacheClear: (previousCacheCreation: Date) => void | Promise<any>;
  }>();
  /**
   * Data loader
   */
  const api: EndpointGetFunction<TKeys, TResult> = Object.assign(
    function transmitFunction(keys: TKeys) {
      const url = getUrl(keys, options.url);
      const headers = getHeaders(keys, headerTemplate, headerKeys);
      // Check if cache is still valid
      const skipCache =
        options.cacheRequest === false ||
        (options.cacheValidator && options.cacheValidator(api) === false);
      // Try to return from cache
      const cacheKey = skipCache ? null : getCacheKey(url, headers);
      if (cacheKey) {
        const ajaxResultFromCache = cache.get(cacheKey);
        if (ajaxResultFromCache) {
          return ajaxResultFromCache;
        }
      }
      // Execute request
      const ajaxResultPromise = api.loader(keys, url.value, headers.value);
      // Store in cache
      if (cacheKey) {
        cache.set(cacheKey, ajaxResultPromise);
        if (!api.cacheCreation) {
          api.cacheCreation = new Date();
        }
      }
      // Fire handlers
      return ajaxResultPromise
        .then(
          ajaxResult =>
            options.afterSuccess && options.afterSuccess(ajaxResult),
          error => options.afterError && options.afterError(error)
        )
        .then(() => ajaxResultPromise);
    },
    {
      method: "GET" as const,
      loader,
      /** Clears all cached requests */
      clearCache: () => {
        const previousCacheCreation = api.cacheCreation;
        if (previousCacheCreation) {
          api.cacheCreation = undefined;
          cache.clear();
          return Promise.all(emitter.emit("cacheClear", previousCacheCreation));
        }
        return Promise.resolve([]);
      },
      /**
       * Helper to prevent memory leaks for cached components
       *
       * Returns a clear cache function for the given keys
       * Once all clear cache functions for the given keys have been
       * called the memory is freed after a timeout of 20s
       */
      keepInCache: (keys: TKeys, timeout?: number) => {
        const cacheKey = api.getCacheKey(keys);
        const consumer = keepInCacheTracker.get(cacheKey) || { count: 0 };
        consumer.count++;
        clearTimeout(consumer.timeout);
        keepInCacheTracker.set(cacheKey, consumer);
        let disposed = false;
        // Return the release from cache function
        // to allow garbage collection
        return () => {
          const consumer = keepInCacheTracker.get(cacheKey);
          // If this is the last consumer and it has not been disposed
          // start the cleanup timer
          if (!disposed && consumer && --consumer.count <= 0) {
            disposed = true;
            consumer.timeout = setTimeout(() => {
              cache.delete(cacheKey);
            }, timeout || 20000) as any;
          }
        };
      },
      on: ((event, callback) =>
        emitter.on(event, callback)) as typeof emitter.on,
      off: ((event, callback) =>
        emitter.off(event, callback)) as typeof emitter.off,
      cacheCreation: undefined,
      getCacheKey: (keys: TKeys) =>
        getCacheKey(
          getUrl(keys, options.url),
          getHeaders(keys, headerTemplate, headerKeys)
        )
    }
  );
  return api;
}

export function createDeleteEndpoint<TKeys, TResult>(
  options: EndpointDeleteOptions<TKeys, TResult>
): EndpointDeleteFunction<TKeys, TResult> {
  const loader = createLoader(options, "DELETE");
  /** Some requests require special headers like auth tokens */
  const headerTemplate = options.headers || {};
  const headerKeys: Array<keyof typeof headerTemplate> = Object.keys(
    headerTemplate
  );

  /**
   * Data loader
   */
  const api: EndpointDeleteFunction<TKeys, TResult> = Object.assign(
    function transmitFunction(keys: TKeys) {
      const url = getUrl(keys, options.url);
      const headers = getHeaders(keys, headerTemplate, headerKeys);
      // Execute request
      const ajaxResultPromise = api.loader(keys, url.value, headers.value);

      // Fire handlers
      return ajaxResultPromise
        .then(
          ajaxResult =>
            options.afterSuccess && options.afterSuccess(ajaxResult),
          error => options.afterError && options.afterError(error)
        )
        .then(() => ajaxResultPromise);
    },
    {
      method: "DELETE" as const,
      loader
    }
  );
  return api;
}

export function createGetEndpointConverter<
  TKeys,
  TResult,
  TConvertedResult,
  TResultBind = TResult
>(
  endpoint: EndpointGetFunction<TKeys, TResult>,
  converter: (result: TResultBind) => TConvertedResult
) {
  const api = createGetEndpoint<TKeys, TConvertedResult>({
    cacheValidator: () => {
      // If the real endpoint
      // has an younger or empty cache
      // also wipe this cache
      if (
        api.cacheCreation &&
        (!endpoint.cacheCreation || endpoint.cacheCreation < api.cacheCreation)
      ) {
        api.clearCache();
      }
      return true;
    },
    loader: (keys: TKeys) => {
      return endpoint(keys).then(result =>
        converter((result as unknown) as TResultBind)
      );
    },
    url: (keys: TKeys) => endpoint.getCacheKey(keys)
  });
  return api;
}

/**
 * Get url for the given keys
 */
function getUrl<TKeys>(
  keys: TKeys,
  urlTemplate: (keys: TKeys) => string
): Cachable {
  const url = urlTemplate(keys);
  return { cacheKey: url, value: url };
}

/**
 * Get the header object for the given keys
 */
function getHeaders<
  TKeys,
  THeader extends { [keys: string]: (keys: TKeys) => string }
>(
  keys: TKeys,
  headerTemplate: THeader,
  headerKeys: Array<keyof THeader>
): Cachable<{ [key: string]: string }> {
  let cacheKey = "";
  const headers: { [key: string]: string } = {};
  headerKeys.forEach(headerKey => {
    const header = headerTemplate[headerKey](keys);
    cacheKey += JSON.stringify([(headerKey as string) + header]);
    headers[headerKey as string] = header;
  });
  return {
    cacheKey,
    value: headers
  };
}

/**
 * Turns the cachable url and header into a cache key
 */
function getCacheKey(
  url: Cachable,
  header: Cachable<{ [key: string]: string }>
): string {
  return header.cacheKey + " - " + url.cacheKey;
}
