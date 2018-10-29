import { load, recursiveLoader } from './lib/ajax';
export { AJAX_ERROR_EVENT_NAME, AjaxError } from './lib/errorHandler';

export interface EnpointGetOptions<TKeys, TResult, TKeysBind = TKeys> {
	url: (keys: TKeysBind) => string;
	header?: { [keys: string]: (keys: TKeysBind) => string };
	/**
	 * Wether to cache the request - true by default
	 */
	cacheRequest?: boolean;
	/**
	 * A cache store
	 */
	cache?: Cache<TResult>;
	/**
	 * A custom loader
	 */
	loader?: (keys: TKeys, url: string, headers: { [key: string]: string }) => Promise<TResult>;
	/**
	 * Success handler
	 */
	afterSuccess?: (result: TResult) => any;
	/**
	 * Error handler
	 */
	afterError?: (result: Response) => any;
}

export interface EndpointGetFunction<TKeys, TResult> {
	(keys: TKeys): Promise<TResult>;
	/**
	 * The loader without caching
	 */
	loader: (keys: TKeys, url: string, headers: { [key: string]: string }) => Promise<TResult>;
	/**
	 * Clear the cache for this url
	 */
	clearCache: () => void;
	/**
	 * Cache Key
	 */
	getCacheKey: (keys: TKeys) => string
}

export type Cachable<T = string> = { cacheKey: string; value: T };

interface Cache<TResult> {
	get(cacheKey: string): Promise<TResult> | undefined;
	set(cacheKey: string, value: Promise<TResult>): any;
	delete(cacheKey: string): void;
	keys(): Iterable<string> | Array<string>;
}

export function createGetEndpoint<TKeys, TResult>(
	options: EnpointGetOptions<TKeys, TResult>
): EndpointGetFunction<TKeys, TResult> {
	/** Some requests require special headers like auth tokens */
	const headerTemplate = options.header || {};
	const headerKeys: Array<keyof typeof headerTemplate> = Object.keys(headerTemplate);
	const cache: Cache<TResult> = options.cache || new Map<string, Promise<TResult>>();
	/** Clears all cached requests */
	function clearCache() {
		Array.from(cache.keys()).forEach((key) => cache.delete(key));
	}
	const loader =
		options.loader ||
		((keys, url, headers): Promise<TResult> => {
			// Execute request
			const ajaxReponsePromise = recursiveLoader(load, url, headers);
			const ajaxResultPromise = ajaxReponsePromise
				.then((response) => {
					if (!response.ok) {
						throw new Error(`Unexpected status ${response.status} - "${response.statusText}".`);
					}
					return response.clone().text();
				})
				.then((result) => JSON.parse(result)) as Promise<TResult>;

			return ajaxResultPromise;
		});
	/**
	 * Data loader
	 */
	const api: EndpointGetFunction<TKeys, TResult> = Object.assign(
		function transmitFunction(keys: TKeys) {
			const url = getUrl(keys, options.url);
			const headers = getHeaders(keys, headerTemplate, headerKeys);
			// Try to return from cache
			const cacheKey = options.cacheRequest === false ? null : getCacheKey(url, headers);
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
			}
			// Fire handlers
			ajaxResultPromise.then(
				(ajaxResult) => {
					options.afterSuccess && options.afterSuccess(ajaxResult);
				},
				(error) => {
					options.afterError && options.afterError(error);
				}
			);
			return ajaxResultPromise;
		},
		{
			loader,
			clearCache,
			getCacheKey: (keys: TKeys) => getCacheKey(getUrl(keys, options.url), getHeaders(keys, headerTemplate, headerKeys))
		}
	);
	return api;
}

export function createGetEndpointConverter<TKeys, TResult, TConvertedResult, TResultBind = TResult>(endpoint: EndpointGetFunction<TKeys, TResult>, converter: (result: TResultBind) => TConvertedResult) {
	const api = createGetEndpoint<TKeys, TConvertedResult>({
		loader: (keys: TKeys) => endpoint(keys).then((result) => converter(result as unknown as TResultBind)),
		url: (keys: TKeys) => endpoint.getCacheKey(keys),
	});
	return Object.assign(api, {
		clearCache: () => {
			endpoint.clearCache();
			api.clearCache();
		}
	});
}

/**
 * Get url for the given keys
 */
function getUrl<TKeys>(keys: TKeys, urlTemplate: (keys: TKeys) => string): Cachable {
	const url = urlTemplate(keys);
	return { cacheKey: url, value: url };
}

/**
 * Get the header object for the given keys
 */
function getHeaders<TKeys, THeader extends { [keys: string]: (keys: TKeys) => string }>(
	keys: TKeys,
	headerTemplate: THeader,
	headerKeys: Array<keyof THeader>
): Cachable<{ [key: string]: string }> {
	let cacheKey = '';
	const headers: { [key: string]: string } = {};
	headerKeys.forEach((headerKey) => {
		const header = headerTemplate[headerKey](keys);
		cacheKey += JSON.stringify([(headerKey as string) + header]);
		headers[headerKey as string] = header;
	});
	return {
		cacheKey,
		value: headers,
	};
}

/**
 * Turns the cachable url and header into a cache key
 */
function getCacheKey(url: Cachable, header: Cachable<{ [key: string]: string }>): string {
	return header.cacheKey + ' - ' + url.cacheKey;
}
