export var AJAX_ERROR_EVENT_NAME = 'ajaxEndpointFailed';
export function errorHandler(response, errorHandlingAttemps) {
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
/**
 * Broadcasts a global window event.
 */
function broadcastAjaxError(response, responseContent, errorHandlingAttemps) {
    return new Promise(function (resolve, reject) {
        var event = new Event(AJAX_ERROR_EVENT_NAME);
        event.initEvent(AJAX_ERROR_EVENT_NAME, false, true);
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
