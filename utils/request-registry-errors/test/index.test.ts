import { onUnhandledRequestRegistyError, RequestErrorDetails } from '../src';

function createMockError(errorDetails: RequestErrorDetails) {
	const error = Object.assign(new Error(''), {
		__requestRegistry: errorDetails,
	});
	return error;
}

function triggerEvent(error?: Error | null) {
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
			triggerEvent(
				createMockError({
					response: {} as Response,
					responseContent: {
						message: 'Third party system not available',
					},
				})
			);
			unbind();
			expect(errorMessage).toBe('Third party system not available');
		});
		it('should ignore errors beeing null', () => {
			let firedEvents = 0;
			const unbind = onUnhandledRequestRegistyError(() => {
				firedEvents++;
			});
			triggerEvent(null);
			unbind();
			expect(firedEvents).toBe(0);
		});
		it('should ignore errors beeing undefined', () => {
			let firedEvents = 0;
			const unbind = onUnhandledRequestRegistyError(() => {
				firedEvents++;
			});
			triggerEvent(undefined);
			unbind();
			expect(firedEvents).toBe(0);
		});
		it('should track errors for the same responce only once', () => {
			let firedEvents = 0;
			const unbind = onUnhandledRequestRegistyError(() => {
				firedEvents++;
			});
			const event = createMockError({
				response: {} as Response,
				responseContent: {
					message: 'Third party system not available',
				},
			});
			triggerEvent(event);
			triggerEvent(event);
			unbind();
			expect(firedEvents).toBe(1);
		});
	});
});
