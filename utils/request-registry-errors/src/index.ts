import { RequestErrorDetails } from 'request-registry/src/lib/errorHandler';
export { RequestErrorDetails } from 'request-registry/src/lib/errorHandler';

/**
 * Try to detect if the unhandled promise is an RequestRegistry Errror
 */
function isRequestRegistryError(
	unhandledPromiseError: PromiseRejectionEvent
): unhandledPromiseError is Omit<PromiseRejectionEvent, 'reason'> & {
	reason: Error & { __requestRegistry: RequestErrorDetails };
} {
	return (
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
	const handler = (unhandledPromiseError: PromiseRejectionEvent) => {
		const errorDetails = getRequestRegistryErrorDetails(
			unhandledPromiseError
		);
		if (errorDetails) {
			callback(errorDetails);
		}
	};
	window.addEventListener('unhandledrejection', handler);
	return () => {
		window.removeEventListener('unhandledrejection', handler);
	};
}
