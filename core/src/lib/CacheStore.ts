import {
	EndpointHeadersTemplate,
	EndpointWithoutRequestBodyFunction
} from "./Endpoint";
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
	 *
	 * TODO: Change to cacheValidator(api, cacheKey, keys) ?
	 */
	cacheValidator?: (
		api: EndpointWithoutRequestBodyFunction<TKeysBind, TResult, "GET">
	) => boolean;
}

export type Cachable<T = string> = { cacheKey: string; value: T };

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
	cacheMap?: Cache<TResult>
): CacheStore<TKeys, TResult> {
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
		cacheMap || new Map<string, Promise<TResult>>();
	const emitter = new Emitter<{
		cacheClear: (previousCacheCreation: Date) => void | Promise<any>;
	}>();

	const getUrlCacheKey = (keys: TKeys): string =>
		getCacheKey(
			getUrl(keys, url),
			getHeaders(keys, headerTemplate, headerKeys)
		);

	const cacheState: { cacheCreation?: Date } = {};
	/** Clears all cached requests */
	const createCacheStore: {
		cache: Cache<TResult>;
		state: {};
		cacheCreation?: Date;
		getCacheKey: (keys: TKeys) => string;
		keepInCache: (keys: TKeys, timeout?: number) => () => void;
		clearCache: () => Promise<any[]>;
		/** Bind to cache clear events - returns a dispose function */
		on: (
			eventName: "cacheClear",
			callback: (previousCacheCreation: Date) => void
		) => () => void;
		/** Unbind from cache clear events */
		off: (
			eventName: "cacheClear",
			callback?: (previousCacheCreation: Date) => void
		) => void;
	} = {
		cache,
		state: cacheState,
		getCacheKey: getUrlCacheKey,
		clearCache: () => {
			const previousCacheCreation = cacheState.cacheCreation;
			if (previousCacheCreation) {
				cacheState.cacheCreation = undefined;
				cache.clear();
				return Promise.all(
					emitter.emit("cacheClear", previousCacheCreation)
				);
			}
			return Promise.resolve([]);
		},
		on: ((event, callback) =>
			emitter.on(event, callback)) as typeof emitter.on,
		off: ((event, callback) =>
			emitter.off(event, callback)) as typeof emitter.off,
		/**
		 * Helper to prevent memory leaks for cached components
		 *
		 * Returns a clear cache function for the given keys
		 * Once all clear cache functions for the given keys have been
		 * called the memory is freed after a timeout of 20s
		 */
		keepInCache: (keys: TKeys, timeout?: number) => {
			const cacheKey = getUrlCacheKey(keys);
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
		}
	};
	return createCacheStore;
}

/**
 * Turns the cachable url and header into a cache key
 */
export function getCacheKey(
	url: Cachable,
	header: Cachable<{ [key: string]: string }>
): string {
	return header.cacheKey + " - " + url.cacheKey;
}

/**
 * Get url for the given keys
 */
export function getUrl<TKeys>(
	keys: TKeys,
	urlTemplate: (keys: TKeys) => string
): Cachable {
	const url = urlTemplate(keys);
	return { cacheKey: url, value: url };
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
		cacheKey,
		value: headers
	};
}
