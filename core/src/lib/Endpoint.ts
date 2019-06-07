import { recursiveLoader } from "./ajax";
import {
	Cache,
	createCacheStore,
	EndpointCacheOptions,
	getHeaders
} from "./CacheStore";

const noop = () => {};

/**
 * Shared Endpoint Options
 */
export interface EndpointWithoutRequestBodyFunction<
	TKeys,
	TResult,
	TMethod extends "GET" | "DELETE"
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
	/** Endpoint Method */
	readonly method: TMethod;
}

/**
 * Shared Endpoint Options
 */
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

/**
 * Shared Endpoint Options
 */
export interface EndpointOptions<TKeys, TBody, TResult, TKeysBind = TKeys> {
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
		headers: { [key: string]: string },
		body?: TBody
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

export type EndpointHeadersTemplate<TKeys> = {
	[keys: string]: ((keys: TKeys) => string) | string;
};

export type LoaderFunction<TKeys, TBody, TResult> = (
	keys: TKeys,
	url: string,
	headers: { [key: string]: string },
	body?: TBody
) => Promise<TResult>;
export function createLoader<TKeys, TBody, TResult>(
	method: "POST" | "PUT" | "GET" | "DELETE"
): LoaderFunction<TKeys, TBody, TResult> {
	return ((
		keys: TKeys,
		url: string,
		headers: { [key: string]: string },
		body: TBody
	): Promise<TResult> => {
		// Execute request
		const ajaxReponsePromise = recursiveLoader(
			fetch,
			url,
			method,
			headers,
			body
		);
		const ajaxResultPromise = ajaxReponsePromise
			.then(response => response.clone().text() || "{}")
			.then(result => JSON.parse(result)) as Promise<TResult>;

		return ajaxResultPromise;
	}) as LoaderFunction<TKeys, TBody, TResult>;
}

export function createEndpoint<
	TKeys,
	TBody,
	TResult,
	TMethod extends "GET" | "POST" | "PUT" | "DELETE"
>(
	method: TMethod,
	options:
		| EndpointOptions<TKeys, TBody, TResult> & {
				cacheRequest: false;
				cacheValidator: undefined;
		  }
		| EndpointOptions<TKeys, TBody, TResult> &
				EndpointCacheOptions<TKeys, TBody, TResult>
) {
	const loader =
		(options.loader as LoaderFunction<TKeys, TBody, TResult> | undefined) ||
		createLoader(method);
	/** Some requests require special headers like auth tokens */
	const headerTemplate = options.headers || {};
	const headerKeys: Array<keyof typeof headerTemplate> = Object.keys(
		headerTemplate
	);
	/** The cacheManager provides caching features if the request is cachable */
	const cacheManager =
		options.cacheRequest !== false
			? createCacheStore<TKeys, EndpointHeadersTemplate<TKeys>, TResult>(
					options.url,
					headerTemplate,
					headerKeys,
					options.cache,
					options.cacheKey
			  )
			: undefined;
	const cacheValidator = options.cacheValidator || noop;
	const cacheState = (cacheManager && cacheManager._state) || {};
	/**
	 * Data loader
	 */
	const api = Object.assign(
		function transmitFunction(keys: TKeys, body?: TBody) {
			const url = options.url(keys);
			const headers = getHeaders(keys, headerTemplate, headerKeys);
			// Try to return from cache
			let cacheKey: string | undefined;
			let cache: Cache<TResult> | undefined;
			if (cacheManager) {
				cache = cacheManager.cache;
				cacheKey = cacheManager.getCacheKey(keys);
				if (
					// Skip the cache if the users cacheValidation function returns
					// `false` explicitly
					cacheValidator(
						url,
						headers._value,
						cacheKey,
						cache,
						api as any
					) !== false
				) {
					const ajaxResultFromCache = cache!.get(cacheKey);
					if (ajaxResultFromCache) {
						return ajaxResultFromCache;
					}
				}
			}
			// Execute request
			const ajaxResultPromise = api.loader(
				keys,
				url,
				headers._value,
				body
			);
			// Store in cache
			if (cacheKey && cache) {
				cache.set(cacheKey, ajaxResultPromise);
				if (!cacheState._cacheCreation) {
					cacheState._cacheCreation = new Date();
				}
			}
			// Fire handlers
			return (
				ajaxResultPromise
					.then(
						options.afterSuccess || noop,
						options.afterError || noop
					)
					// Return the original values once the handlers are done
					// this allows the handlers to be async but will still return
					// the correct value or show the error stack trace
					.then(() => ajaxResultPromise)
			);
		},
		{
			// Request method ("GET" | "POST" | "PUT" | "DELETE")
			method: method,
			// Mockable data loader
			loader
		},
		cacheManager
	);
	return api;
}
