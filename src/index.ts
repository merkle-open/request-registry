import { load, recursiveLoader } from './lib/ajax';
export { AJAX_ERROR_EVENT_NAME, AjaxError } from './lib/errorHandler';

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

export interface EndpointWithBodyOptions<TKeys, TResult, TKeysBind = TKeys> {
	url: (keys: TKeysBind) => string;
	headers?: { [keys: string]: (keys: TKeysBind) => string };
	/**
	 * A custom loader
	 */
	loader?: (keys: TKeys, url: string, headers: { [key: string]: string }, body?: any) => Promise<TResult>;
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
	getCacheKey: (keys: TKeys) => string;
	/**
	 * The time of the first write into the cache
	 * will be reset on clearCache
	 */
	cacheCreation: Date | undefined;
}

export interface EndpointWithBodyFunction<TKeys, TBody, TResult> {
	(keys: TKeys, body: TBody): Promise<TResult>;
	/**
	 * The loader without caching
	 */
	loader: (keys: TKeys, url: string, headers: { [key: string]: string }, body: TBody) => Promise<TResult>;
}

export type Cachable<T = string> = { cacheKey: string; value: T };

interface Cache<TResult> {
	get(cacheKey: string): Promise<TResult> | undefined;
	set(cacheKey: string, value: Promise<TResult>): any;
	delete(cacheKey: string): void;
	clear(): void;
}

function createLoader<TKeys, TResult>(
	options: EndpointWithBodyOptions<TKeys, TResult>,
	method: string
) {
	const loader =
		options.loader ||
		((keys, url, headers, body?): Promise<TResult> => {
			// Execute request
			const ajaxReponsePromise = recursiveLoader(load, url, method, headers, body);
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
	return loader;
}

function createWithBodyEndpoint<TKeys, TBody, TResult>(
	loader: (keys: TKeys, url: string, headers: { [key: string]: string }) => Promise<TResult>,
	options: EndpointWithBodyOptions<TKeys, TResult>
) {
	const headerTemplate = options.headers || {};
	const headerKeys: Array<keyof typeof headerTemplate> = Object.keys(headerTemplate);
	
	/**
	 * Data loader
	 */
	const api: EndpointWithBodyFunction<TKeys, TBody, TResult> = Object.assign(
		function transmitFunction(keys: TKeys, body: TBody) {
			const url = getUrl(keys, options.url);
			const headers = getHeaders(keys, headerTemplate, headerKeys);
			// Set default Content-Type header,
			// otherwise overwrite it with the one passed in by the config
			headers.value = {
				'Content-Type': 'application/json',
				...headers.value
			}
			// Execute request
			const ajaxResultPromise = api.loader(keys, url.value, headers.value, body);
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
			loader
		}
	);
	return api;
}

export function createPostEndpoint<TKeys, TBody, TResult>(
	options: EndpointWithBodyOptions<TKeys, TResult>
): EndpointWithBodyFunction<TKeys, TBody, TResult> {
	/** Some requests require special headers like auth tokens */
	const loader = createLoader(options, 'POST');
	return createWithBodyEndpoint(loader, options);
}

export function createPutEndpoint<TKeys, TBody, TResult>(
	options: EndpointWithBodyOptions<TKeys, TResult>
): EndpointWithBodyFunction<TKeys, TBody, TResult> {
	/** Some requests require special headers like auth tokens */
	const loader = createLoader(options, 'PUT');
	return createWithBodyEndpoint(loader, options);
}

export function createGetEndpoint<TKeys, TResult>(
	options: EndpointGetOptions<TKeys, TResult>
): EndpointGetFunction<TKeys, TResult> {
	/** Some requests require special headers like auth tokens */
	const headerTemplate = options.headers || {};
	const headerKeys: Array<keyof typeof headerTemplate> = Object.keys(headerTemplate);
	const cache: Cache<TResult> = options.cache || new Map<string, Promise<TResult>>();
	/** Clears all cached requests */
	const loader = createLoader(options, 'GET');
	
	/**
	 * Data loader
	 */
	const api: EndpointGetFunction<TKeys, TResult> = Object.assign(
		function transmitFunction(keys: TKeys) {
			const url = getUrl(keys, options.url);
			const headers = getHeaders(keys, headerTemplate, headerKeys);
			// Check if cache is still valid
			const skipCache =
				options.cacheRequest === false || (options.cacheValidator && options.cacheValidator(api) === false);
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
			clearCache: () => {
				api.cacheCreation = undefined;
				cache.clear();
			},
			cacheCreation: undefined,
			getCacheKey: (keys: TKeys) =>
				getCacheKey(getUrl(keys, options.url), getHeaders(keys, headerTemplate, headerKeys)),
		}
	);
	return api;
}

export function createGetEndpointConverter<TKeys, TResult, TConvertedResult, TResultBind = TResult>(
	endpoint: EndpointGetFunction<TKeys, TResult>,
	converter: (result: TResultBind) => TConvertedResult
) {
	const api = createGetEndpoint<TKeys, TConvertedResult>({
		cacheValidator: () => {
			// If the real endpoint
			// has an younger or empty cache
			// also wipe this cache
			if (api.cacheCreation && (!endpoint.cacheCreation || endpoint.cacheCreation < api.cacheCreation)) {
				api.clearCache();
			}
			return true;
		},
		loader: (keys: TKeys) => {
			return endpoint(keys).then((result) => converter((result as unknown) as TResultBind));
		},
		url: (keys: TKeys) => endpoint.getCacheKey(keys),
	});
	return api;
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
