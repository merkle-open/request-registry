import { errorHandler } from './errorHandler';
/**
 * The main load function
 */
export function load(url, init) {
    return crossBrowserFetch(url, init);
}
/**
 * The recurisve loader allows to retry requests
 */
export function recursiveLoader(loadFn, url, method, headers, body) {
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
                : errorHandler(response, errorHandlingAttemps).then(function (resolverName) {
                    // Store the resolver name
                    errorHandlingAttemps.push(resolverName);
                    // Retry loading
                    return loadWithErrorHandling();
                }, function () { return response; });
        });
    }
    return loadWithErrorHandling();
}
/**
 * Small helper to lazy load the fech library if missing (IE11)
 */
function crossBrowserFetch(url, init) {
    if (typeof fetch === 'undefined') {
        // Lazy load ponyfill if necessary
        return import(/* webpackChunkName: "request-registry-fetch-ponyfill" */ 'fetch-ponyfill').then(function (fetchPonyfill) { return fetchPonyfill.default().fetch(url, init); });
    }
    return fetch(url, init);
}
