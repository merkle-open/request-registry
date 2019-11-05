import { RequestError } from 'request-registry/src/lib/errorHandler';

export type RequestErrorDetails = {
	response: Response;
	responseContent: unknown;
};

/**
 * Try to detect if the unhandled promise is an RequestRegistry Errror
 */
function isRequestRegistryError(
	unhandledPromiseError: PromiseRejectionEvent
): unhandledPromiseError is Omit<PromiseRejectionEvent, 'reason'> & {
	reason: RequestError;
} {
	return (
		unhandledPromiseError.reason &&
		typeof unhandledPromiseError.reason === 'object' &&
		'__requestRegistry' in unhandledPromiseError.reason
	);
}

/**
 * Try to extract RequestRegistry Errror information from a PromiseRejectionEvent
 */
function getRequestRegistryErrorDetails(
	unhandledPromiseError: PromiseRejectionEvent
): RequestErrorDetails | void {
	if (isRequestRegistryError(unhandledPromiseError)) {
		return unhandledPromiseError.reason.__requestRegistry;
	}
}

export function onUnhandledRequestRegistyError(
	callback: (e: RequestErrorDetails) => void
): () => void {
	const knownErrorResponses = new WeakSet<Response>();
	const handler = (unhandledPromiseError: PromiseRejectionEvent) => {
		const errorDetails = getRequestRegistryErrorDetails(
			unhandledPromiseError
		);
		if (errorDetails) {
			// Check if the callback was already executed
			// for this error
			// This might happen if multiple parts of the app use
			// the same endpoint
			if (knownErrorResponses.has(errorDetails.response)) {
				return;
			}
			knownErrorResponses.add(errorDetails.response);
			callback(errorDetails);
		}
	};
	window.addEventListener('unhandledrejection', handler);
	return () => {
		window.removeEventListener('unhandledrejection', handler);
	};
}
