import { Emitter } from "./Emitter";
export type AjaxError = Error & { error: ErrorResponseError };
export const ERROR_EMITTER = new Emitter<{
	error: (error: ErrorResponseError) => boolean | void;
}>();

export type ErrorResponseError = {
	response: Response;
	responseContent: object;
	errorHandlingAttemps: Array<string>;
	resolve: (reason: string) => any;
	reject: () => any;
};

export function errorHandler(
	response: Response,
	errorHandlingAttemps: Array<string>
): Promise<string> {
	// Try to extract the result to know the error reason
	// to allow resolving the error
	const errorResponseContentPromise: Promise<{
		[key: string]: any;
	}> = response
		// Clone to prevent the fetch body to be used
		.clone()
		// Text to support JSON & text
		.text()
		.catch(text => text)
		.then(resultText => {
			try {
				return JSON.parse(resultText);
			} catch (e) {
				return { message: resultText };
			}
		})
		// If text parsing failed provide an empty object
		.catch(() => ({}));
	return errorResponseContentPromise.then(errorResponseContent =>
		broadcastAjaxError(response, errorResponseContent, errorHandlingAttemps)
	);
}

export type RequestErrorDetails = {
	response: Response;
	responseContent: unknown;
};

/**
 * Broadcasts a global window event.
 */
function broadcastAjaxError(
	response: Response,
	responseContent: object,
	errorHandlingAttemps: Array<string>
): Promise<string> {
	return new Promise((resolve, reject) => {
		const defaultWasPrevented = ERROR_EMITTER.emit("error", {
			response,
			responseContent,
			resolve,
			reject,
			errorHandlingAttemps
		}).some(result => result === false);
		if (!defaultWasPrevented) {
			if (!defaultWasPrevented) {
				const unhandledErrror = new Error(
					process.env.NODE_ENV !== "production"
						? `Unhandled ajax error ${
								response.status
						  } ${JSON.stringify(
								responseContent
						  )} Resolve Attemps: ${errorHandlingAttemps.join(
								","
						  ) || "none"}`
						: "Ajax failed"
				);
				// Add a hidden property which can be extracted using the request-registry-errors package
				Object.defineProperty(unhandledErrror, "__requestRegistry", {
					enumerable: false,
					value: { response, responseContent } as RequestErrorDetails,
					writable: false
				});
				reject(unhandledErrror);
			}
		}
	});
}
