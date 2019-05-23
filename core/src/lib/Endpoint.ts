import { recursiveLoader, load } from "./ajax";
import {
	createCacheStore,
	EndpointCacheOptions,
	Cache,
	getUrl,
	getHeaders,
	getCacheKey
} from "./CacheStore";

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
	headers?: { [keys: string]: (keys: TKeysBind) => string };
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
function createLoader<TKeys, TBody, TResult>(
	options: EndpointOptions<TKeys, TBody, TResult>,
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
			load,
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
		| EndpointOptions<TKeys, TBody, TResult> & { cacheRequest: false }
		| EndpointOptions<TKeys, TBody, TResult> &
				EndpointCacheOptions<TKeys, TBody, TResult>
) {
	const loader =
		(options.loader as LoaderFunction<TKeys, TBody, TResult> | undefined) ||
		createLoader(options, method);
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
					headerKeys
			  )
			: undefined;
	const cacheValidator =
		"cacheValidator" in options && options.cacheValidator;
	const cacheState = (cacheManager && cacheManager.state) || {};
	/**
	 * Data loader
	 */
	const api = Object.assign(
		function transmitFunction(keys: TKeys, body?: TBody) {
			const url = getUrl(keys, options.url);
			const headers = getHeaders(keys, headerTemplate, headerKeys);
			// Try to return from cache
			let cacheKey: string | undefined;
			let cache: Cache<TResult> | undefined;
			if (cacheManager) {
				cache = cacheManager.cache;
				cacheKey = getCacheKey(url, headers);
				// Check if cache is still valid
				const skipCache =
					cacheValidator &&
					cacheValidator(
						url.value,
						headers.value,
						cacheKey,
						cache,
						api as any
					) === false;
				if (cacheKey && !skipCache) {
					const ajaxResultFromCache = cache!.get(cacheKey);
					if (ajaxResultFromCache) {
						return ajaxResultFromCache;
					}
				}
			}
			// Execute request
			const ajaxResultPromise = api.loader(
				keys,
				url.value,
				headers.value,
				body
			);
			// Store in cache
			if (cacheKey && cache) {
				cache.set(cacheKey, ajaxResultPromise);
				if (!cacheState.cacheCreation) {
					cacheState.cacheCreation = new Date();
				}
			}
			// Fire handlers
			return ajaxResultPromise
				.then(
					ajaxResult =>
						options.afterSuccess &&
						options.afterSuccess(ajaxResult),
					error => options.afterError && options.afterError(error)
				)
				.then(() => ajaxResultPromise);
		},
		{
			method: method,
			loader
		},
		cacheManager
	);
	return api;
}
