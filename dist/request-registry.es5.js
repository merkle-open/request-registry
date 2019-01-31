var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
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
define("lib/errorHandler", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AJAX_ERROR_EVENT_NAME = 'ajaxEndpointFailed';
    function errorHandler(response, errorHandlingAttemps) {
        // Try to extract the result to know the error reason
        // to allow resolving the error
        var errorResponseContentPromise = response
            // Clone to prevent the fetch body to be used
            .clone()
            // Text to support JSON & text
            .text()
            .catch(function (resultText) {
            try {
                return JSON.parse(resultText);
            }
            catch (e) {
                return { message: resultText };
            }
        })
            // If text parsing failed provide an empty object
            .catch(function () { return ({}); });
        return errorResponseContentPromise.then(function (errorResponseContent) {
            return broadcastAjaxError(response, errorResponseContent, errorHandlingAttemps);
        });
    }
    exports.errorHandler = errorHandler;
    /**
     * Broadcasts a global window event.
     */
    function broadcastAjaxError(response, responseContent, errorHandlingAttemps) {
        return new Promise(function (resolve, reject) {
            var event = new Event(exports.AJAX_ERROR_EVENT_NAME);
            event.initEvent(exports.AJAX_ERROR_EVENT_NAME, false, true);
            Object.defineProperty(event, 'error', {
                value: {
                    response: response,
                    responseContent: responseContent,
                    resolve: resolve,
                    reject: reject,
                    errorHandlingAttemps: errorHandlingAttemps,
                },
                writable: false,
                configurable: false,
            });
            var defaultWasPrevented = !document.documentElement.dispatchEvent(event);
            if (!defaultWasPrevented) {
                reject(new Error("Unhandled ajax error " + response.status + " " + JSON.stringify(responseContent) + " Resolve Attemps: " + (errorHandlingAttemps.join(',') || 'none')));
            }
        });
    }
});
define("lib/ajax", ["require", "exports", "lib/errorHandler"], function (require, exports, errorHandler_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * The main load function
     */
    function load(url, init) {
        return crossBrowserFetch(url, init);
    }
    exports.load = load;
    /**
     * The recurisve loader allows to retry requests
     */
    function recursiveLoader(loadFn, url, method, headers, body) {
        var errorHandlingAttemps = [];
        /**
         * Recursive helper function to retry the load
         * until either the response is okay or the errhandler can't handle the error
         */
        function loadWithErrorHandling() {
            // TODO: Consider strinifying the body, but then you can't send Form Data.
            return loadFn(url, { method: method, headers: headers, body: body }).then(function (response) {
                return response.ok
                    ? response
                    : errorHandler_1.errorHandler(response, errorHandlingAttemps).then(function (resolverName) {
                        // Store the resolver name
                        errorHandlingAttemps.push(resolverName);
                        // Retry loading
                        return loadWithErrorHandling();
                    }, function () { return response; });
            });
        }
        return loadWithErrorHandling();
    }
    exports.recursiveLoader = recursiveLoader;
    /**
     * Small helper to lazy load the fech library if missing (IE11)
     */
    function crossBrowserFetch(url, init) {
        if (typeof fetch === 'undefined') {
            // Lazy load ponyfill if necessary
            return new Promise(function (resolve_1, reject_1) { require([/* webpackChunkName: "request-registry-fetch-ponyfill" */ 'fetch-ponyfill'], resolve_1, reject_1); }).then(__importStar).then(function (fetchPonyfill) { return fetchPonyfill.default().fetch(url, init); });
        }
        return fetch(url, init);
    }
});
define("index", ["require", "exports", "lib/ajax", "lib/errorHandler"], function (require, exports, ajax_1, errorHandler_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AJAX_ERROR_EVENT_NAME = errorHandler_2.AJAX_ERROR_EVENT_NAME;
    function createLoader(options, method) {
        var loader = options.loader ||
            (function (keys, url, headers, body) {
                // Execute request
                var ajaxReponsePromise = ajax_1.recursiveLoader(ajax_1.load, url, method, headers, body);
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
    function createPostEndpoint(options) {
        /** Some requests require special headers like auth tokens */
        var loader = createLoader(options, 'POST');
        return createWithBodyEndpoint(loader, options);
    }
    exports.createPostEndpoint = createPostEndpoint;
    function createPutEndpoint(options) {
        /** Some requests require special headers like auth tokens */
        var loader = createLoader(options, 'PUT');
        return createWithBodyEndpoint(loader, options);
    }
    exports.createPutEndpoint = createPutEndpoint;
    function createGetEndpoint(options) {
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
    exports.createGetEndpoint = createGetEndpoint;
    function createDeleteEndpoint(options) {
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
    exports.createDeleteEndpoint = createDeleteEndpoint;
    function createGetEndpointConverter(endpoint, converter) {
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
    exports.createGetEndpointConverter = createGetEndpointConverter;
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
});
