export { AJAX_ERROR_EVENT_NAME, AjaxError } from './lib/errorHandler';
export interface EndpointGetOptions<TKeys, TResult, TKeysBind = TKeys> {
    url: (keys: TKeysBind) => string;
    headers?: {
        [keys: string]: (keys: TKeysBind) => string;
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
     */
    cacheValidator?: (api: EndpointGetFunction<TKeysBind, TResult>) => boolean;
    /**
     * A custom loader
     */
    loader?: (keys: TKeys, url: string, headers: {
        [key: string]: string;
    }) => Promise<TResult>;
    /**
     * Success handler
     */
    afterSuccess?: (result: TResult) => any;
    /**
     * Error handler
     */
    afterError?: (result: Response) => any;
}
export interface EndpointWithBodyOptions<TKeys, TBody, TResult, TKeysBind = TKeys> {
    url: (keys: TKeysBind) => string;
    headers?: {
        [keys: string]: (keys: TKeysBind) => string;
    };
    /**
     * A custom loader
     */
    loader?: (keys: TKeys, url: string, headers: {
        [key: string]: string;
    }, body: TBody) => Promise<TResult>;
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
    headers?: {
        [keys: string]: (keys: TKeysBind) => string;
    };
    /**
     * A custom loader
     */
    loader?: (keys: TKeys, url: string, headers: {
        [key: string]: string;
    }) => Promise<TResult>;
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
    loader: (keys: TKeys, url: string, headers: {
        [key: string]: string;
    }) => Promise<TResult>;
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
    loader: (keys: TKeys, url: string, headers: {
        [key: string]: string;
    }, body: TBody) => Promise<TResult>;
}
export interface EndpointDeleteFunction<TKeys, TResult> {
    (keys: TKeys): Promise<TResult>;
    /**
     * The loader without caching
     */
    loader: (keys: TKeys, url: string, headers: {
        [key: string]: string;
    }) => Promise<TResult>;
}
export declare type Cachable<T = string> = {
    cacheKey: string;
    value: T;
};
interface Cache<TResult> {
    get(cacheKey: string): Promise<TResult> | undefined;
    set(cacheKey: string, value: Promise<TResult>): any;
    delete(cacheKey: string): void;
    clear(): void;
}
export declare function createPostEndpoint<TKeys, TBody, TResult>(options: EndpointWithBodyOptions<TKeys, TBody, TResult>): EndpointWithBodyFunction<TKeys, TBody, TResult>;
export declare function createPutEndpoint<TKeys, TBody, TResult>(options: EndpointWithBodyOptions<TKeys, TBody, TResult>): EndpointWithBodyFunction<TKeys, TBody, TResult>;
export declare function createGetEndpoint<TKeys, TResult>(options: EndpointGetOptions<TKeys, TResult>): EndpointGetFunction<TKeys, TResult>;
export declare function createDeleteEndpoint<TKeys, TResult>(options: EndpointDeleteOptions<TKeys, TResult>): EndpointDeleteFunction<TKeys, TResult>;
export declare function createGetEndpointConverter<TKeys, TResult, TConvertedResult, TResultBind = TResult>(endpoint: EndpointGetFunction<TKeys, TResult>, converter: (result: TResultBind) => TConvertedResult): EndpointGetFunction<TKeys, TConvertedResult>;
