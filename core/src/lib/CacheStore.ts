import { EndpointHeadersTemplate } from "./Endpoint";
import { Emitter } from "./Emitter";

export interface Cache<TResult> {
	get(cacheKey: string): Promise<TResult> | undefined;
	set(cacheKey: string, value: Promise<TResult>): any;
	delete(cacheKey: string): void;
	clear(): void;
}

/** The cache store controller allows to manage the cache of an endpoint */
export interface CacheStore<TKeys, TResult> {
	/**
	 * The internal cache map key value pair of `cacheKey`:`ajaxResultPromise`
	 */
	cache: Cache<TResult>;
	/**
	 * Clear the cache for this url
	 */
	refresh: () => Promise<any[]>;
	/**
	 * Cache Key
	 */
	getCacheKey: (keys: TKeys) => string;
	/**
	 * The time of the first write into the cache
	 * will be reset on refresh
	 */
	_state: { _cacheCreation?: Date };
	/**
	 * Observe updates to the cache store
	 *
	 * Returns a clear cache function for the given keys
	 * Once all clear cache functions for the given keys have been
	 * called the memory is freed after a timeout of 20s
	 */
	observe: (
		keys: TKeys,
		callback: (result: TResult) => any,
		timeout?: number
	) => () => void;
	/**
	 * Observe updates to the cache store
	 *
	 * Returns a clear cache function for the given keys
	 * Once all clear cache functions for the given keys have been
	 * called the memory is freed after a timeout of 20s
	 */
	observePromise: (
		keys: TKeys,
		callback: (result: Promise<TResult>) => any,
		timeout?: number
	) => () => void;
}

/**
 * Shared Endpoint Cache Options
 */
export interface EndpointCacheOptions<
	TKeys,
	TBody,
	TResult,
	TKeysBind = TKeys
> {
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
	cacheValidator?: (
		url: string,
		headers: { [keys: string]: string },
		cacheKey: string,
		cache: Cache<TResult>,
		api: any
	) => boolean;
	/** A custom cacheKey implementation */
	cacheKey?: (keys: TKeys) => string;
}

export type Cachable<T = string> = { _cacheKey: string; _value: T };

/**
 * The createCacheStore provides util functions and events
 * to manage an endpoint cacheMap object
 */
export function createCacheStore<
	TKeys,
	THeader extends EndpointHeadersTemplate<TKeys>,
	TResult
>(
	url: (keys: TKeys) => string,
	headerTemplate: THeader,
	headerKeys: Array<keyof THeader>,
	cacheMap?: Cache<TResult>,
	cacheKeyGenerator?: (keys: TKeys, baseCacheKey: string) => string
): CacheStore<TKeys, TResult> {
	/** Helper map to track which CacheKeys can be garbage collected */
	const keepInCacheTracker = new Map<
		/** CacheKey */ string,
		{
			/** The amount of cache consumers for the given CacheKey */
			_count: number;
			/** The setTimeout to cleanup the given cache once all consumers are gone */
			_timeout?: number;
		}
	>();
	const cache: Cache<TResult> =
		cacheMap || new Map<string, Promise<TResult>>();
	const emitter = new Emitter<{
		cacheClear: (previousCacheCreation: Date) => void | Promise<any>;
	}>();

	const getUrlCacheKey = (keys: TKeys): string =>
		getCacheKey(url(keys), getHeaders(keys, headerTemplate, headerKeys));

	const cacheState: { _cacheCreation?: Date } = {};
	const cacheStoreController: {
		cache: Cache<TResult>;
		_state: {};
		getCacheKey: (keys: TKeys) => string;
		observe: (
			keys: TKeys,
			callback: (result: TResult) => any,
			timeout?: number
		) => () => void;
		observePromise: (
			keys: TKeys,
			callback: (result: Promise<TResult>) => any,
			timeout?: number
		) => () => void;
		refresh: () => Promise<any[]>;
	} = {
		cache,
		_state: cacheState,
		getCacheKey: cacheKeyGenerator
			? keys => cacheKeyGenerator(keys, getUrlCacheKey(keys))
			: getUrlCacheKey,
		refresh: () => {
			const previousCacheCreation = cacheState._cacheCreation;
			let cacheClearHandlers: Array<Promise<any> | void> = [];
			if (previousCacheCreation) {
				cacheState._cacheCreation = undefined;
				keepInCacheTracker.clear();
				cache.clear();
				cacheClearHandlers = emitter.emit(
					"cacheClear",
					previousCacheCreation
				);
			}
			return Promise.all(cacheClearHandlers);
		},
		/**
		 * Observe updates to the cache store
		 *
		 * Returns a clear cache function for the given keys
		 * Once all clear cache functions for the given keys have been
		 * called the memory is freed after a timeout of 20s
		 */
		observe: function(
			keys: TKeys,
			callback: (result: TResult) => Promise<any>,
			timeout?: number
		) {
			let latestPromise: Promise<TResult> | undefined;
			return this.observePromise(
				keys,
				endpointPromise => {
					// Store the latest endpoint promise
					// to ensure that even if the backend speed differs
					// only the latest ajax result is returned
					latestPromise = endpointPromise;
					return endpointPromise.then(result =>
						latestPromise === endpointPromise
							? callback(result)
							: undefined
					);
				},
				timeout
			);
		},
		/**
		 * Observe updates to the cache store
		 * The callback is executed once a new load start
		 *
		 * Returns a clear cache function for the given keys
		 * Once all clear cache functions for the given keys have been
		 * called the memory is freed after a timeout of 20s
		 */
		observePromise: function(
			keys: TKeys,
			callback: (result: Promise<TResult>) => any,
			timeout?: number
		) {
			const cacheKey = getUrlCacheKey(keys);
			const consumer = keepInCacheTracker.get(cacheKey) || { _count: 0 };
			consumer._count++;
			clearTimeout(consumer._timeout);
			keepInCacheTracker.set(cacheKey, consumer);
			let disposed = false;
			// The `observe` function will be bound to an endpoint therefore `this()` executes the endpoint.
			// This is kind of hacky however it reduces the file size a lot
			const endpoint = (this as any) as (keys: TKeys) => Promise<TResult>;
			const executeEndpoint = () => callback(endpoint(keys));
			// Execute the callback once again whenever the cache is cleared to get an up to date
			// version of the endpoint data
			const unbindCacheClear = emitter.on("cacheClear", executeEndpoint);
			executeEndpoint();
			// Return the release from cache function
			// to allow garbage collection
			return () => {
				const consumer = keepInCacheTracker.get(cacheKey);
				unbindCacheClear();
				// If this is the last consumer and it has not been disposed
				// start the cleanup timer
				if (!disposed && consumer && --consumer._count <= 0) {
					disposed = true;
					consumer._timeout = setTimeout(() => {
						keepInCacheTracker.delete(cacheKey);
						cache.delete(cacheKey);
					}, timeout || 20000) as any;
				}
			};
		}
	};
	return cacheStoreController;
}

/**
 * Turns the cachable url and header into a cache key
 */
export function getCacheKey(
	url: string,
	header: Cachable<{ [key: string]: string }>
): string {
	return header._cacheKey + " - " + url;
}

/**
 * Get the header object for the given keys
 */
export function getHeaders<
	TKeys,
	THeader extends EndpointHeadersTemplate<TKeys>
>(
	keys: TKeys,
	headerTemplate: THeader,
	headerKeys: Array<keyof THeader>
): Cachable<{ [key: string]: string }> {
	let cacheKey = "";
	const headers: { [key: string]: string } = {};
	headerKeys.forEach(headerKey => {
		const headerValueOfKey: string | ((keys: TKeys) => string) =
			headerTemplate[headerKey];
		const header =
			typeof headerValueOfKey === "function"
				? headerValueOfKey(keys)
				: headerValueOfKey;
		cacheKey += JSON.stringify(header);
		headers[headerKey as string] = header;
	});
	return {
		_cacheKey: cacheKey,
		_value: headers
	};
}
