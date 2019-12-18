import {
	createEndpointMock,
	unmockAllEndpoints,
	mockEndpointOnce,
	mockEndpoint,
	activateMocks,
	setRequestMockLogging,
} from '../src/';
import {
	createGetEndpoint,
	createPostEndpoint,
	createPutEndpoint,
	createDeleteEndpoint,
} from 'request-registry';

afterAll(() => unmockAllEndpoints());

describe('request-registry-mock', () => {
	describe('GET', () => {
		it('should create a mock without errors', () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			createEndpointMock(userEndpoint, async () => ({ name: 'Alex' }));
		});

		it('should allow to activate a mock without errors', () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const userEndpointMock = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			userEndpointMock.activate();
		});

		it('should allow to clear a mock without errors', () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const userEndpointMock = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			userEndpointMock.activate();
			userEndpointMock.clear();
		});

		it('should allow to clear a mock twice without errors', () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const userEndpointMock = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			userEndpointMock.activate();
			userEndpointMock.clear();
			userEndpointMock.clear();
		});

		it('should response with the mocked value', async () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const userEndpointMock = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			userEndpointMock.activate();
			expect(await userEndpoint({})).toEqual({ name: 'Alex' });
		});

		it('should allow to remove the mock', async () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const unmockedLoader = userEndpoint.loader;
			const userEndpointMock = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			userEndpointMock.activate();
			userEndpointMock.clear();
			expect(userEndpoint.loader).toEqual(unmockedLoader);
		});

		it('should allow to remove all mocks', async () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const unmockedLoader = userEndpoint.loader;
			const userEndpointMock = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			userEndpointMock.activate();
			unmockAllEndpoints();
			expect(userEndpoint.loader).toBe(unmockedLoader);
		});

		it('should allow to remove a second mock', async () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const userEndpointMock1 = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			const userEndpointMock2 = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Chris',
				})
			);
			userEndpointMock1.activate();
			userEndpointMock2.activate();
			expect(await userEndpoint({})).toEqual({ name: 'Chris' });
			userEndpoint.refresh();
			userEndpointMock2.clear();
			expect(await userEndpoint({})).toEqual({ name: 'Alex' });
		});

		it('should allow to remove a unused mock from the queue', async () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const unmockedLoader = userEndpoint.loader;
			const userEndpointMock1 = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			const userEndpointMock2 = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Chris',
				})
			);
			userEndpointMock1.activate();
			userEndpointMock2.activate();
			expect(await userEndpoint({})).toEqual({ name: 'Chris' });
			userEndpoint.refresh();
			userEndpointMock1.clear();
			expect(await userEndpoint({})).toEqual({ name: 'Chris' });
			userEndpointMock2.clear();
			expect(userEndpoint.loader).toBe(unmockedLoader);
		});
	});

	describe('mockEndpointOnce', () => {
		it('should create a mock without errors', async () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			mockEndpointOnce(userEndpoint, async () => ({ name: 'Alex' }));
			mockEndpointOnce(userEndpoint, async () => ({ name: 'Chris' }));
			expect(await userEndpoint({})).toEqual({ name: 'Chris' });
			userEndpoint.refresh();
			expect(await userEndpoint({})).toEqual({ name: 'Alex' });
		});
	});

	describe('activateMocks', () => {
		it('should activate two mocks for the same endpoint', async () => {
			const userEndpoint = createGetEndpoint<{}, { name: string }>({
				url: () => '/user',
			});
			const userEndpointMock1 = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Alex',
				})
			);
			const userEndpointMock2 = createEndpointMock(
				userEndpoint,
				async () => ({
					name: 'Chris',
				})
			);
			activateMocks(userEndpointMock1, userEndpointMock2);
			expect(await userEndpoint({})).toEqual({ name: 'Chris' });
			userEndpointMock2.clear();
			userEndpoint.refresh();
			expect(await userEndpoint({})).toEqual({ name: 'Alex' });
		});
	});

	describe('PUT', () => {
		it('should return the put response', async () => {
			const setEmailEndpoint = createPutEndpoint<
				{ userId: string },
				{ email: string },
				{ emailSet: boolean }
			>({
				url: ({ userId }) => `/user/${userId}`,
			});
			mockEndpoint(setEmailEndpoint, async () => ({ emailSet: true }));
			const response = await setEmailEndpoint(
				{ userId: '1' },
				{ email: 'alex@host.com' }
			);
			expect(response).toEqual({ emailSet: true });
		});
		it('should forward the body to the mock function', async () => {
			const setEmailEndpoint = createPutEndpoint<
				{ userId: string },
				{ email: string }
			>({
				url: ({ userId }) => `/user/${userId}`,
			});
			let mockArguments;
			mockEndpoint(setEmailEndpoint, async (keys, url, header, body) => {
				mockArguments = { keys, url, header, body };
				return undefined;
			});
			await setEmailEndpoint({ userId: '1' }, { email: 'alex@host.com' });
			expect(mockArguments).toEqual({
				body: {
					email: 'alex@host.com',
				},
				header: {
					'Content-Type': 'application/json',
				},
				keys: {
					userId: '1',
				},
				url: '/user/1',
			});
		});
	});

	describe('DELETE', () => {
		it('should return the delete response', async () => {
			const deleteUserEndpoint = createDeleteEndpoint<
				{ userId: string },
				{ deleted: boolean }
			>({
				url: ({ userId }) => `/user/delete/${userId}`,
			});
			mockEndpoint(deleteUserEndpoint, async () => ({ deleted: true }));
			const response = await deleteUserEndpoint({ userId: '1' });
			expect(response).toEqual({ deleted: true });
		});
		it('should forward the body to the mock function', async () => {
			const deleteUserEndpoint = createDeleteEndpoint<
				{ userId: string },
				{ deleted: boolean }
			>({
				url: ({ userId }) => `/user/delete/${userId}`,
			});
			let mockArguments;
			mockEndpoint(deleteUserEndpoint, async (keys, url, header) => {
				mockArguments = { keys, url, header };
				return { deleted: true };
			});
			await deleteUserEndpoint({ userId: '1' });
			expect(mockArguments).toEqual({
				header: {},
				keys: {
					userId: '1',
				},
				url: '/user/delete/1',
			});
		});
	});

	describe('POST', () => {
		it('should return the post response', async () => {
			const setEmailEndpoint = createPostEndpoint<
				{ userId: string },
				{ email: string },
				{ emailSet: boolean }
			>({
				url: ({ userId }) => `/user/${userId}`,
			});
			mockEndpoint(setEmailEndpoint, async () => ({ emailSet: true }));
			const response = await setEmailEndpoint(
				{ userId: '1' },
				{ email: 'alex@host.com' }
			);
			expect(response).toEqual({ emailSet: true });
		});
		it('should forward the body to the mock function', async () => {
			const setEmailEndpoint = createPostEndpoint<
				{ userId: string },
				{ email: string }
			>({
				url: ({ userId }) => `/user/${userId}`,
			});
			let mockArguments;
			mockEndpoint(setEmailEndpoint, async (keys, url, header, body) => {
				mockArguments = { keys, url, header, body };
				return undefined;
			});
			await setEmailEndpoint({ userId: '1' }, { email: 'alex@host.com' });
			expect(mockArguments).toEqual({
				body: {
					email: 'alex@host.com',
				},
				header: {
					'Content-Type': 'application/json',
				},
				keys: {
					userId: '1',
				},
				url: '/user/1',
			});
		});
	});

	describe('Logging', () => {
		it('should allow to disable logging', async () => {
			setRequestMockLogging(false);
			const setEmailEndpoint = createPostEndpoint<
				{ userId: string },
				{ email: string },
				{ emailSet: boolean }
			>({
				url: ({ userId }) => `/user/${userId}`,
			});
			mockEndpoint(setEmailEndpoint, async () => ({ emailSet: true }));
			const response = await setEmailEndpoint(
				{ userId: '1' },
				{ email: 'alex@host.com' }
			);
			expect(response).toEqual({ emailSet: true });
		});
	});
});
