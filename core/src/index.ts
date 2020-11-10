import { Cache, EndpointCacheOptions } from "./lib/CacheStore";
import {
	createEndpoint,
	EndpointOptions,
	EndpointWithoutRequestBodyFunction,
	EndpointWithRequestBodyFunction,
	createLoader
} from "./lib/Endpoint";
import { AjaxError as AjaxErrorType } from "./lib/errorHandler";
export { ERROR_EMITTER } from "./lib/errorHandler";
export type AjaxError = AjaxErrorType;

/**
 * Default Headers for POST and PUT requests
 *
 * Can be overwritten by setting it to `undefined`.
 */
const defaultSendHeaders = { "Content-Type": "application/json" } as const;

// GET Options
export interface EndpointGetOptions<TKeys, TResult, TKeysBind = TKeys>
	extends EndpointOptions<TKeys, null, TResult, TKeysBind>,
		EndpointCacheOptions<TKeys, null, TResult, TKeysBind> {
	/**
	 * A function to create the url
	 */
	url: (keys: TKeysBind) => string;
	headers?: {
		[keys: string]:
			| string
			| undefined
			| ((keys: TKeysBind) => string | void | undefined);
	};
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
	refresh: () => Promise<any[]>;
	/**
	 * Cache Key
	 */
	getCacheKey: (keys: TKeys) => string;
	/**
	 * A cache store
	 */
	cache?: Cache<TResult>;
	/**
	 * Helper to prevent memory leaks
	 *
	 * Returns a clear cache function for the given keys
	 * Once all clear cache functions for the given keys have been
	 * called the memory is freed after a timeout of 20s
	 */
	observe: (keys: TKeys, callback: (result: TResult) => void) => () => void;
	/**
	 * Helper to prevent memory leaks
	 *
	 * Returns a clear cache function for the given keys
	 * Once all clear cache functions for the given keys have been
	 * called the memory is freed after a timeout of 20s
	 */
	observePromise: (
		keys: TKeys,
		callback: (result: Promise<TResult>) => void
	) => () => void;
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
	headers?: {
		[keys: string]:
			| string
			| undefined
			| ((keys: TKeysBind) => string | void | undefined);
	};
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
	headers?: {
		[keys: string]:
			| string
			| undefined
			| ((keys: TKeysBind) => string | void | undefined);
	};
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
	headers?: {
		[keys: string]:
			| string
			| undefined
			| ((keys: TKeysBind) => string | void | undefined);
	};
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

// GraphQl Options
export interface EndpointGraphQlOptions<TKeys, TResult, TKeysBind = TKeys>
	extends EndpointCacheOptions<TKeys, null, TResult, TKeysBind> {
	/**
	 * A function to create the url
	 */
	url: (keys: TKeysBind) => string;
	/**
	 * GraphQL Query
	 */
	query: string;
	/**
	 * GraphQl Variables
	 */
	variables?: (keys: TKeysBind) => { [key: string]: any } | undefined;
	headers?: {
		[keys: string]:
			| string
			| undefined
			| ((keys: TKeysBind) => string | void | undefined);
	};
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
		headers: { [key: string]: string },
		graphQlBody: {
			query: string;
			variables: { [key: string]: any } | undefined;
		}
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

export function createGraphQlEndpoint<TKeys, TResult>(
	options: EndpointGraphQlOptions<TKeys, TResult>
) {
	const graphQLVariables = options.variables;
	const loader =
		options.loader ||
		createLoader<TKeys, { query: string; variables: any }, TResult>("POST");
	return createEndpoint(
		"POST",
		Object.assign(
			{
				cacheKey: (keys: TKeys, baseKey: string) =>
					JSON.stringify(
						graphQLVariables ? graphQLVariables(keys) : keys
					) + baseKey
			},
			options,
			{
				loader: (
					keys: TKeys,
					url: string,
					headers: { [key: string]: string }
				) =>
					// Build up the post body and execute the loader
					loader(keys, url, headers, {
						query: options.query,
						variables: graphQLVariables
							? graphQLVariables(keys)
							: keys
					})
			}
		)
	);
}
