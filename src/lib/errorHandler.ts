export type AjaxError = Error & { error: ErrorResponseError };
export const AJAX_ERROR_EVENT_NAME = 'ajaxEndpointFailed';

export type ErrorResponseError = {
	response: Response;
	responseContent: object;
	errorHandlingAttemps: Array<string>;
	resolve: (reason: string) => any;
	reject: () => any;
};

export function errorHandler(response: Response, errorHandlingAttemps: Array<string>): Promise<string> {
	// Try to extract the result to know the error reason
	const errorResponseContentPromise: Promise<{ [key: string]: any }> = response
		.clone()
		.text()
		.catch((resultText) => {
			try {
				return JSON.parse(resultText);
			} catch (e) {
				return { message: resultText };
			}
		})
		.catch(() => ({}));
	return errorResponseContentPromise.then((errorResponseContent) =>
		broadcastAjaxError(response, errorResponseContent, errorHandlingAttemps)
	);
}

/**
 * Broadcasts a global window event.
 */
function broadcastAjaxError(
	response: Response,
	responseContent: object,
	errorHandlingAttemps: Array<string>
): Promise<string> {
	return new Promise((resolve, reject) => {
		const event = new Event(AJAX_ERROR_EVENT_NAME);
		event.initEvent(AJAX_ERROR_EVENT_NAME, false, true);
		Object.defineProperty(event, 'error', {
			value: {
				response,
				responseContent,
				resolve,
				reject,
				errorHandlingAttemps,
			} as ErrorResponseError,
			writable: false,
			configurable: false,
		});
		const defaultWasPrevented = !document.documentElement!.dispatchEvent(event);
		if (!defaultWasPrevented) {
			reject(
				new Error(
					`Unhandled ajax error ${response.status} ${JSON.stringify(
						responseContent
					)} Resolve Attemps: ${errorHandlingAttemps.join(',') || 'none'}`
				)
			);
		}
	});
}
