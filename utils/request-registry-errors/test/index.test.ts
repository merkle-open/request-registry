import { onUnhandledRequestRegistyError, RequestErrorDetails } from '../src';

function triggerEvent(errorDetails: RequestErrorDetails) {
	const error = Object.assign(new Error(''), {
		__requestRegistry: errorDetails,
	});
	const event = Object.assign(document.createEvent('Event'), {
		reason: error,
	});
	event.initEvent('unhandledrejection', true, true);
	window.dispatchEvent(event);
}

describe('request-registry-error', () => {
	describe('getRequestRegistryErrorDetails', () => {
		it('should fire on errors', () => {
			let errorMessage = '';
			const unbind = onUnhandledRequestRegistyError(error => {
				errorMessage = (error.responseContent as { message: string })
					.message;
			});
			triggerEvent({
				response: {} as Response,
				responseContent: {
					message: 'Third party system not available',
				},
			});
			unbind();
			expect(errorMessage).toBe('Third party system not available');
		});
	});
});
