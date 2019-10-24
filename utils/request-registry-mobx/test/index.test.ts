import { createObservableEndpoint } from '../src';
import { createGetEndpoint } from 'request-registry';
import {
	mockEndpointOnce,
	mockEndpoint,
	unmockAllEndpoints,
} from 'request-registry-mock';
import { when, autorun } from 'mobx';

afterAll(() => {
	unmockAllEndpoints();
});

describe('request-registry-mobx', () => {
	describe('observable endpoint', () => {
		it('can create a store without error', () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string; age: number }
			>({
				url: keys => `/user/${keys.id}`,
			});
			const endpoint = createObservableEndpoint(userEndpoint);
			expect(typeof endpoint).toEqual('object');
		});

		it('starts in loading state', () => {
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
			const endpoint = createObservableEndpoint(userEndpoint, {
				id: '1',
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
			const endpoint = createObservableEndpoint(userEndpoint, {
				id: '1',
			});
			await when(() => endpoint.state !== 'LOADING');
			expect(endpoint.state).toEqual('DONE');
			expect(endpoint.busy).toEqual(false);
			expect(endpoint.value).toEqual({ name: 'Sue', age: 24 });
		});

		it('allows to start without an inital key', async () => {
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
			const endpoint = createObservableEndpoint(userEndpoint);
			expect(endpoint.busy).toEqual(true);
			endpoint.setKeys({ id: '1' });
			await when(() => endpoint.state !== 'LOADING');
			expect(endpoint.state).toEqual('DONE');
			expect(endpoint.busy).toEqual(false);
			expect(endpoint.value).toEqual({ name: 'Sue', age: 24 });
		});

		it('switches to updating state if the endpoint was load before', async () => {
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
			const endpoint = createObservableEndpoint(userEndpoint, {
				id: '1',
			});
			// Wait for first request
			await when(() => endpoint.state !== 'LOADING');
			mockEndpointOnce(
				userEndpoint,
				async () => ({ name: 'Joe', age: 18 }),
				1
			);
			// Trigger second request
			endpoint.setKeys({ id: '2' });
			// Wait for second request
			await when(() => endpoint.state !== 'DONE');
			expect(endpoint.state).toEqual('UPDATING');
			expect(endpoint.busy).toEqual(true);
			// Should still allow accessing the outdated value:
			expect(endpoint.value).toEqual({ name: 'Sue', age: 24 });
		});

		it('switches from updating state to load state once the second request is done', async () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string; age: number }
			>({
				url: keys => `/user/${keys.id}`,
			});
			mockEndpoint(
				userEndpoint,
				async (_keys, url) =>
					({
						'/user/1': { name: 'Sue', age: 24 },
						'/user/2': { name: 'Joe', age: 18 },
					}[(url as '/user/1') || '/user/2']),
				50
			);
			const endpoint = createObservableEndpoint(userEndpoint, {
				id: '1',
			});
			// Wait for first request
			await when(() => endpoint.state !== 'LOADING');
			// Trigger second request
			endpoint.setKeys({ id: '2' });
			// Wait for second request
			await when(() => endpoint.state !== 'DONE');
			await when(() => endpoint.state !== 'UPDATING');
			expect(endpoint.state).toEqual('DONE');
			expect(endpoint.busy).toEqual(false);
			expect(endpoint.value).toEqual({ name: 'Joe', age: 18 });
		});

		it('will take care of a slow outdated request', async () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string; age: number }
			>({
				url: keys => `/user/${keys.id}`,
			});
			mockEndpoint(
				userEndpoint,
				async ({ id }) => {
					if (id === 'slow-request') {
						await sleep(15);
						return { name: 'Slow', age: 99 };
					}
					return { name: 'Fast', age: 1 };
				},
				1
			);
			const endpoint = createObservableEndpoint(userEndpoint, {
				id: 'slow-request',
			});
			expect(endpoint.busy).toEqual(true);
			// Start a request which will finish before the slow one finishs
			endpoint.setKeys({ id: 'fast-request' });
			await when(() => endpoint.state !== 'LOADING');
			// Start for the slow request to finish
			await sleep(20);
			// Ensure that the data belongs to the fast one
			expect(endpoint.value).toEqual({ name: 'Fast', age: 1 });
		});

		it('will execute the request again if a store is still observed', async () => {
			const runEndpoint = createGetEndpoint<{}, { runs: number }>({
				url: () => `/run/`,
			});
			let run = 1;
			mockEndpoint(runEndpoint, async () => ({ runs: run++ }), 1);
			const endpoint = createObservableEndpoint(runEndpoint, { id: '1' });
			// Start observing the endpoint:
			const unobserve = autorun(() => endpoint.value);
			await when(() => endpoint.state === 'DONE');
			expect(endpoint.value).toEqual({ runs: 1 });
			// Invalidate the cache:
			runEndpoint.refresh();
			// Wait for a new run count
			await when(() =>
				Boolean(endpoint.value && endpoint.value.runs !== 1)
			);
			expect(endpoint.value).toEqual({ runs: 2 });
			unobserve();
		});

		it('will not crash if the cache is cleared and keys are still unknown', async () => {
			const runEndpoint = createGetEndpoint<{}, { runs: number }>({
				url: () => `/run/`,
			});
			let run = 1;
			mockEndpoint(runEndpoint, async () => ({ runs: run++ }), 1);
			// Execute the endpoint once to allow cache cleaning
			await runEndpoint({});
			const endpoint = createObservableEndpoint(runEndpoint);
			// Start observing the endpoint:
			const unobserve = autorun(() => endpoint.value);
			// Invalidate the cache:
			runEndpoint.refresh();
			expect(endpoint.busy).toEqual(true);
			unobserve();
		});
	});
});

function sleep(delay: number) {
	return new Promise(resolve => setTimeout(resolve, delay));
}
