import { Cache, EndpointCacheOptions } from "./lib/CacheStore";
import {
	createEndpoint,
	EndpointOptions,
	EndpointWithoutRequestBodyFunction,
	EndpointWithRequestBodyFunction
} from "./lib/Endpoint";
import { AjaxError as AjaxErrorType } from "./lib/errorHandler";
export { ERROR_EMITTER } from "./lib/errorHandler";
export type AjaxError = AjaxErrorType;

/** Default Headers for POST and PUT requests */
const defaultSendHeaders = { "Content-Type": "application/json" } as const;

// GET Options
export interface EndpointGetOptions<TKeys, TResult, TKeysBind = TKeys>
	extends EndpointOptions<TKeys, null, TResult, TKeysBind>,
		EndpointCacheOptions<TKeys, null, TResult, TKeysBind> {
	/**
	 * A function to create the url
	 */
	url: (keys: TKeysBind) => string;
	headers?: { [keys: string]: string | ((keys: TKeysBind) => string) };
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
	 *
	 */
	cacheValidator?: (
		url: string,
		headers: { [keys: string]: string },
		cacheKey: string,
		cache: Cache<TResult>,
		api: EndpointWithoutRequestBodyFunction<TKeysBind, TResult, "GET">
	) => boolean;
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

// GET Result
export interface EndpointGetFunction<TKeys extends {}, TResult extends unknown>
	extends EndpointWithoutRequestBodyFunction<TKeys, TResult, "GET"> {
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
	state: { cacheCreation?: Date };
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

/**
 * Create an endpoint to execute ajax GET requests
 */
export function createGetEndpoint<TKeys, TResult>(
	options: EndpointGetOptions<TKeys, TResult>
) {
	return createEndpoint("GET", options) as EndpointGetFunction<
		TKeys,
		TResult
	>;
}

// Post Options
export interface EndpointPostOptions<TKeys, TBody, TResult, TKeysBind = TKeys>
	extends EndpointOptions<TKeys, TBody, TResult, TKeysBind> {
	/**
	 * A function to create the url
	 */
	url: (keys: TKeysBind) => string;
	headers?: { [keys: string]: string | ((keys: TKeysBind) => string) };
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

export interface EndpointPostFunction<TKeys, TBody, TResult>
	extends EndpointWithRequestBodyFunction<TKeys, TBody, TResult, "POST"> {
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
	readonly method: "POST";
}

/**
 * Create an endpoint to execute ajax POST requests
 */
export function createPostEndpoint<TKeys, TBody, TResult = undefined>(
	options: EndpointPostOptions<TKeys, TBody, TResult>
) {
	return createEndpoint(
		"POST",
		Object.assign({ cacheRequest: false }, options, {
			headers: Object.assign({}, defaultSendHeaders, options.headers)
		})
	) as EndpointPostFunction<TKeys, TBody, TResult>;
}

// Put Options
export interface EndpointPutOptions<TKeys, TBody, TResult, TKeysBind = TKeys>
	extends EndpointOptions<TKeys, TBody, TResult, TKeysBind> {
	/**
	 * A function to create the url
	 */
	url: (keys: TKeysBind) => string;
	headers?: { [keys: string]: string | ((keys: TKeysBind) => string) };
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

export interface EndpointPutFunction<TKeys, TBody, TResult>
	extends EndpointWithRequestBodyFunction<TKeys, TBody, TResult, "PUT"> {
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
	readonly method: "PUT";
}

/**
 * Create an endpoint to execute ajax PUT requests
 */
export function createPutEndpoint<TKeys, TBody, TResult = undefined>(
	options: EndpointPutOptions<TKeys, TBody, TResult>
) {
	return createEndpoint(
		"PUT",
		Object.assign({ cacheRequest: false }, options, {
			headers: Object.assign({}, defaultSendHeaders, options.headers)
		})
	) as EndpointPutFunction<TKeys, TBody, TResult>;
}

// DELETE Options
export interface EndpointDeleteOptions<TKeys, TResult, TKeysBind = TKeys>
	extends EndpointOptions<TKeys, null, TResult, TKeysBind> {
	/**
	 * A function to create the url
	 */
	url: (keys: TKeysBind) => string;
	headers?: { [keys: string]: string | ((keys: TKeysBind) => string) };
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

// GET Result
export interface EndpointDeleteFunction<
	TKeys extends {},
	TResult extends unknown
> extends EndpointWithoutRequestBodyFunction<TKeys, TResult, "DELETE"> {
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

/**
 * Create an endpoint to execute ajax DELETE requests
 */
export function createDeleteEndpoint<TKeys, TResult>(
	options: EndpointDeleteOptions<TKeys, TResult>
) {
	return createEndpoint(
		"DELETE",
		Object.assign({ cacheRequest: false }, options)
	) as EndpointDeleteFunction<TKeys, TResult>;
}
