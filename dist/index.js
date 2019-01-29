var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { load, recursiveLoader } from './lib/ajax';
export { AJAX_ERROR_EVENT_NAME } from './lib/errorHandler';
function createLoader(options, method) {
    var loader = options.loader ||
        (function (keys, url, headers, body) {
            // Execute request
            var ajaxReponsePromise = recursiveLoader(load, url, method, headers, body);
            var ajaxResultPromise = ajaxReponsePromise
                .then(function (response) {
                if (!response.ok) {
                    throw new Error("Unexpected status " + response.status + " - \"" + response.statusText + "\".");
                }
                return response.clone().text();
            })
                .then(function (result) { return JSON.parse(result); });
            return ajaxResultPromise;
        });
    return loader;
}
function createWithBodyEndpoint(loader, options) {
    var headerTemplate = options.headers || {};
    var headerKeys = Object.keys(headerTemplate);
    /**
     * Data loader
     */
    var api = Object.assign(function transmitFunction(keys, body) {
        var url = getUrl(keys, options.url);
        var headers = getHeaders(keys, headerTemplate, headerKeys);
        // Set default Content-Type header,
        // otherwise overwrite it with the one passed in by the config
        headers.value = __assign({ 'Content-Type': 'application/json' }, headers.value);
        // Execute request
        var ajaxResultPromise = api.loader(keys, url.value, headers.value, body);
        // Fire handlers
        ajaxResultPromise.then(function (ajaxResult) {
            options.afterSuccess && options.afterSuccess(ajaxResult);
        }, function (error) {
            options.afterError && options.afterError(error);
        });
        return ajaxResultPromise;
    }, {
        loader: loader
    });
    return api;
}
export function createPostEndpoint(options) {
    /** Some requests require special headers like auth tokens */
    var loader = createLoader(options, 'POST');
    return createWithBodyEndpoint(loader, options);
}
export function createPutEndpoint(options) {
    /** Some requests require special headers like auth tokens */
    var loader = createLoader(options, 'PUT');
    return createWithBodyEndpoint(loader, options);
}
export function createGetEndpoint(options) {
    var loader = createLoader(options, 'GET');
    /** Some requests require special headers like auth tokens */
    var headerTemplate = options.headers || {};
    var headerKeys = Object.keys(headerTemplate);
    var cache = options.cache || new Map();
    /** Clears all cached requests */
    /**
     * Data loader
     */
    var api = Object.assign(function transmitFunction(keys) {
        var url = getUrl(keys, options.url);
        var headers = getHeaders(keys, headerTemplate, headerKeys);
        // Check if cache is still valid
        var skipCache = options.cacheRequest === false || (options.cacheValidator && options.cacheValidator(api) === false);
        // Try to return from cache
        var cacheKey = skipCache ? null : getCacheKey(url, headers);
        if (cacheKey) {
            var ajaxResultFromCache = cache.get(cacheKey);
            if (ajaxResultFromCache) {
                return ajaxResultFromCache;
            }
        }
        // Execute request
        var ajaxResultPromise = api.loader(keys, url.value, headers.value);
        // Store in cache
        if (cacheKey) {
            cache.set(cacheKey, ajaxResultPromise);
            if (!api.cacheCreation) {
                api.cacheCreation = new Date();
            }
        }
        // Fire handlers
        ajaxResultPromise.then(function (ajaxResult) {
            options.afterSuccess && options.afterSuccess(ajaxResult);
        }, function (error) {
            options.afterError && options.afterError(error);
        });
        return ajaxResultPromise;
    }, {
        loader: loader,
        clearCache: function () {
            api.cacheCreation = undefined;
            cache.clear();
        },
        cacheCreation: undefined,
        getCacheKey: function (keys) {
            return getCacheKey(getUrl(keys, options.url), getHeaders(keys, headerTemplate, headerKeys));
        },
    });
    return api;
}
export function createDeleteEndpoint(options) {
    var loader = createLoader(options, 'DELETE');
    /** Some requests require special headers like auth tokens */
    var headerTemplate = options.headers || {};
    var headerKeys = Object.keys(headerTemplate);
    /**
     * Data loader
     */
    var api = Object.assign(function transmitFunction(keys) {
        var url = getUrl(keys, options.url);
        var headers = getHeaders(keys, headerTemplate, headerKeys);
        // Execute request
        var ajaxResultPromise = api.loader(keys, url.value, headers.value);
        // Fire handlers
        ajaxResultPromise.then(function (ajaxResult) {
            options.afterSuccess && options.afterSuccess(ajaxResult);
        }, function (error) {
            options.afterError && options.afterError(error);
        });
        return ajaxResultPromise;
    }, {
        loader: loader
    });
    return api;
}
export function createGetEndpointConverter(endpoint, converter) {
    var api = createGetEndpoint({
        cacheValidator: function () {
            // If the real endpoint
            // has an younger or empty cache
            // also wipe this cache
            if (api.cacheCreation && (!endpoint.cacheCreation || endpoint.cacheCreation < api.cacheCreation)) {
                api.clearCache();
            }
            return true;
        },
        loader: function (keys) {
            return endpoint(keys).then(function (result) { return converter(result); });
        },
        url: function (keys) { return endpoint.getCacheKey(keys); },
    });
    return api;
}
/**
 * Get url for the given keys
 */
function getUrl(keys, urlTemplate) {
    var url = urlTemplate(keys);
    return { cacheKey: url, value: url };
}
/**
 * Get the header object for the given keys
 */
function getHeaders(keys, headerTemplate, headerKeys) {
    var cacheKey = '';
    var headers = {};
    headerKeys.forEach(function (headerKey) {
        var header = headerTemplate[headerKey](keys);
        cacheKey += JSON.stringify([headerKey + header]);
        headers[headerKey] = header;
    });
    return {
        cacheKey: cacheKey,
        value: headers,
    };
}
/**
 * Turns the cachable url and header into a cache key
 */
function getCacheKey(url, header) {
    return header.cacheKey + ' - ' + url.cacheKey;
}
