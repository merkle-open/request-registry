import { createObservableEndpoint } from '../src';
import { createGetEndpoint } from 'request-registry';
import {
	mockEndpointOnce,
	mockEndpoint,
	unmockAllEndpoints,
} from 'request-registry-mock';

afterAll(() => {
	unmockAllEndpoints();
});

describe('request-registry-rxjs', () => {
	describe('observable endpoint', () => {
		it('can create an observable without error', () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string; age: number }
			>({
				url: keys => `/user/${keys.id}`,
			});
			const endpoint$ = createObservableEndpoint(userEndpoint, {
				id: '10',
			});
			expect(typeof endpoint$).toEqual('object');
		});

		it('starts in loading state', async () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string; age: number }
			>({
				url: keys => `/user/${keys.id}`,
			});
			const endpoint$ = createObservableEndpoint(userEndpoint, {
				id: '10',
			});
			mockEndpointOnce(
				userEndpoint,
				async () => ({ name: 'Sue', age: 24 }),
				1
			);
			const endpoint = await new Promise<any>(resolve => {
				endpoint$.subscribe(endpointState => {
					resolve(endpointState);
				});
			});
			expect(endpoint.state).toEqual('LOADING');
			expect(endpoint.busy).toEqual(true);
		});

		it('switches to load state once the request is done', async () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string; age: number }
			>({
				url: keys => `/user/${keys.id}`,
			});
			mockEndpointOnce(
				userEndpoint,
				async () => ({ name: 'Sue', age: 24 }),
				1
			);
			const endpoint$ = createObservableEndpoint(userEndpoint, {
				id: '10',
			});
			const endpointState = await new Promise<any>(resolve => {
				endpoint$.subscribe(endpointState => {
					if (endpointState.state !== 'LOADING') {
						resolve(endpointState);
					}
				});
			});

			expect(endpointState.state).toEqual('DONE');
			expect(endpointState.busy).toEqual(false);
			expect(endpointState.value).toEqual({ name: 'Sue', age: 24 });
		});

		it('will execute the request again if a store is still observed', async () => {
			const runEndpoint = createGetEndpoint<{}, { runs: number }>({
				url: () => `/run/`,
			});
			let run = 1;
			mockEndpoint(runEndpoint, async () => ({ runs: run++ }), 1);
			const endpoint$ = createObservableEndpoint(runEndpoint, {});
			// Take first result
			const endpoint = new Promise<any>(resolve => {
				let subscription = endpoint$.subscribe(endpointState => {
					if (endpointState.state !== 'LOADING') {
						subscription.unsubscribe();
						resolve(endpointState);
					}
				});
			});
			// Take second result
			const endpoint2 = new Promise<any>(resolve => {
				let subscription = endpoint$.subscribe(endpointState => {
					if (endpointState.hasData && endpointState.value.runs > 1) {
						resolve(endpointState);
						{
							subscription.unsubscribe();
						}
					}
				});
			});
			// Wait for first request
			expect((await endpoint).value).toEqual({ runs: 1 });
			// Invalidate the cache:
			runEndpoint.clearCache();
			// Wait for a new run count
			expect((await endpoint2).value).toEqual({ runs: 2 });
		});
	});
});
