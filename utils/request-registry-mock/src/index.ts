//
// This is a dev util to allow mocking during development
//
import {
	EndpointGetFunction,
	EndpointDeleteFunction,
	EndpointPostFunction,
	EndpointPutFunction,
} from 'request-registry';

/** A GET or DELETE endpoint */
type EndpointWithoutBody<TKeys, TResult> =
	| EndpointGetFunction<TKeys, TResult>
	| EndpointDeleteFunction<TKeys, TResult>;
/** A POST or PUT endpoint */
type EndpointWithBody<TKeys, TBody, TResult> =
	| EndpointPostFunction<TKeys, TBody, TResult>
	| EndpointPutFunction<TKeys, TBody, TResult>;
/** A GET, DELETE, POST or PUT endpoint */
type Endpoint = EndpointWithoutBody<any, any> | EndpointWithBody<any, any, any>;

/** Extract the TKey type of an endpoint */
type EndpointKeys<
	TEndpointFunction extends Endpoint
> = TEndpointFunction extends
	| EndpointWithoutBody<infer TKeys, any>
	| EndpointWithBody<infer TKeys, any, any>
	? TKeys
	: never;

/** Extract the TBody type of an endpoint */
type EndpointBody<
	TEndpointFunction
> = TEndpointFunction extends EndpointWithBody<any, infer TBody, any>
	? TBody
	: never;

/** Extract the TResult type of an endpoint */
type EndpointResult<
	TEndpointFunction extends Endpoint
> = TEndpointFunction extends
	| EndpointWithoutBody<any, infer TResult>
	| EndpointWithBody<any, any, infer TResult>
	? TResult
	: never;

/** The internal loader function of a GET or DELETE endpoint */
type EndpointLoaderFunctionWithoutBody<
	TEndpoint extends EndpointWithoutBody<any, any>
> = (
	keys: EndpointKeys<TEndpoint>,
	url: string,
	headers: { [key: string]: string }
) => Promise<EndpointResult<TEndpoint>>;

/** The internal loader function of a POST or PUT endpoint */
type EndpointLoaderFunctionWithBody<
	TEndpoint extends EndpointWithBody<any, any, any>
> = (
	keys: EndpointKeys<TEndpoint>,
	url: string,
	headers: { [key: string]: string },
	body: EndpointBody<TEndpoint>
) => Promise<EndpointResult<TEndpoint>>;

/** The internal loader function of a GET, PUT, POST or DELETE endpoint */
type EndpointLoader<
	TEndpoint extends Endpoint
> = TEndpoint extends EndpointWithoutBody<
	EndpointKeys<TEndpoint>,
	EndpointResult<TEndpoint>
>
	? EndpointLoaderFunctionWithoutBody<TEndpoint>
	: TEndpoint extends EndpointWithBody<
			EndpointKeys<TEndpoint>,
			EndpointBody<TEndpoint>,
			EndpointResult<TEndpoint>
	  >
	? EndpointLoaderFunctionWithBody<TEndpoint>
	: never;

/**
 * Helper to store all original loader functions to revert back to the original
 */
const originalLoaders = new WeakMap<
	Endpoint,
	Array<
		| EndpointLoaderFunctionWithBody<any>
		| EndpointLoaderFunctionWithoutBody<any>
	>
>();
/**
 * Set of all currently active mocks
 */
const activeMocks = new Set<Endpoint>();

const baseMocks = new WeakMap<EndpointLoader<any>, EndpointLoader<any>>();

type EndpointMock = {
	activate: () => () => void;
	clear: () => void;
};
/**
 * Create a mock controller which allows to easily activate or deactivate this mock version
 * Usage:
 *
 * ```
 *    const userJoeMock = createMockEndpoint(getUserName, async () => ({name: 'Joe'}));
 *    // Activate mock:
 *    userJoeMock.activate();
 *    // Deactivate mock:
 *    userJoeMock.clear();
 * ```
 *
 */
export function createEndpointMock<
	TEndpoint extends EndpointWithBody<any, any, any>,
	TMockResponse extends EndpointLoaderFunctionWithBody<TEndpoint>
>(
	endpoint: TEndpoint,
	mockResponse: TMockResponse,
	delay?: number
): EndpointMock;
export function createEndpointMock<
	TEndpoint extends EndpointWithoutBody<any, any>,
	TMockResponse extends EndpointLoaderFunctionWithoutBody<TEndpoint>
>(
	endpoint: TEndpoint,
	mockResponse: TMockResponse,
	delay?: number
): EndpointMock;
export function createEndpointMock<
	TEndpoint extends Endpoint,
	TMockResponse extends EndpointLoader<TEndpoint>
>(
	endpoint: TEndpoint,
	mockResponse: TMockResponse,
	delay?: number
): EndpointMock {
	return {
		activate: () =>
			mockEndpoint<TEndpoint, TMockResponse>(
				endpoint,
				mockResponse,
				delay
			),
		clear: () => unmockEndpoint(endpoint, mockResponse),
	};
}

/**
 * Activate multiple mocks at once
 * Usage:
 *
 * ```
 *    const userJoeMock = createMockEndpoint(getUserName, async () => ({name: 'Joe'}));
 *    const userAgeMock = createMockEndpoint(getAgeName, async () => ({age: 99}));
 *    activateMocks(userJoeMock, userAgeMock)
 * ```
 */
export function activateMocks(
	...endpointMocks: Array<{ activate: () => void }>
) {
	endpointMocks.forEach(endpointMocks => {
		endpointMocks.activate();
	});
}

/**
 * Activate a mock for a given endpoint
 * This mock will be executed whenever the endpoint is loaded
 */
export function mockEndpoint<
	TEndpoint extends EndpointWithBody<any, any, any>,
	TMockResponse extends EndpointLoaderFunctionWithBody<TEndpoint>
>(endpoint: TEndpoint, mockResponse: TMockResponse, delay?: number): () => void;
export function mockEndpoint<
	TEndpoint extends EndpointWithoutBody<any, any>,
	TMockResponse extends EndpointLoaderFunctionWithoutBody<TEndpoint>
>(endpoint: TEndpoint, mockResponse: TMockResponse, delay?: number): () => void;
export function mockEndpoint<
	TEndpoint extends Endpoint,
	TMockResponse extends EndpointLoader<TEndpoint>
>(endpoint: TEndpoint, mockResponse: TMockResponse, delay?: number): () => void;
export function mockEndpoint<
	TEndpoint extends Endpoint,
	TMockResponse extends EndpointLoader<TEndpoint>
>(endpoint: TEndpoint, mockResponse: TMockResponse, delay?: number) {
	// Remember the previous loader
	const originalLoadersOfEndpoint = originalLoaders.get(endpoint) || [];
	originalLoadersOfEndpoint.push(endpoint.loader);
	activeMocks.add(endpoint);
	// If the array is new add it to the map
	if (originalLoadersOfEndpoint.length === 1) {
		originalLoaders.set(endpoint, originalLoadersOfEndpoint);
	}
	endpoint.loader = function(
		_keys: EndpointKeys<TEndpoint>,
		url: string,
		headers: {},
		body?: EndpointBody<TEndpoint>
	) {
		const args = arguments;
		const mockResult = new Promise(resolve =>
			delay ? setTimeout(resolve, delay) : resolve()
		).then(
			() =>
				(mockResponse as any).apply(this, args) as EndpointResult<
					TEndpoint
				>
		);
		return logRequest(endpoint, url, headers, mockResult, body);
	};
	// Add the original mockFunction to find it during cleanup
	baseMocks.set(endpoint.loader, mockResponse);
	// Clear caches without rerendering
	const cache =
		'cache' in endpoint &&
		(endpoint as EndpointGetFunction<any, any>).cache;
	if (cache) {
		cache.clear();
	}
	// Return the dispose function
	return unmockEndpoint.bind(null, endpoint, endpoint.loader);
}

function getBaseMock(loaderFunction: EndpointLoader<any>) {
	return baseMocks.get(loaderFunction);
}

/**
 * Reverts back to the original endpoint behaviour
 *
 * If a specific mock function is given only this function
 * will be reverted
 */
function unmockEndpoint(
	endpoint: Endpoint,
	loaderFunction?: EndpointLoader<any>
) {
	const originalLoadersOfEndpoint = originalLoaders.get(endpoint) || [];
	if (getBaseMock(endpoint.loader) === loaderFunction) {
		// If this endpoint is active remove it and activate the next in queue
		const previousLoader = originalLoadersOfEndpoint.pop();
		/* istanbul ignore else */
		if (previousLoader) {
			endpoint.loader = previousLoader;
		}
		// Make sure that further access to the endpoint will not
		// be a cached version of this mock
		if ('cache' in endpoint && endpoint.cache) {
			endpoint.cache.clear();
		}
	} else if (loaderFunction === undefined) {
		// If no loaderFunction was given Erase all loaders
		const originalLoader = originalLoadersOfEndpoint.splice(0)[0];
		/* istanbul ignore else */
		if (originalLoader) {
			endpoint.loader = originalLoader;
		}
	} else {
		// If the loaderFunction is not active remove it from the mock queue
		const index = originalLoadersOfEndpoint.findIndex(
			queuedLoader => getBaseMock(queuedLoader) === loaderFunction
		);
		/* istanbul ignore else */
		if (index !== -1) {
			originalLoadersOfEndpoint.splice(index, 1);
		}
	}
	// If there are no more loaders in the que clean up
	if (originalLoadersOfEndpoint.length === 0) {
		activeMocks.delete(endpoint);
		originalLoaders.delete(endpoint);
	}
}

/**
 * Activate a mock for a given endpoint for one request
 */
export function mockEndpointOnce<
	TEndpoint extends Endpoint,
	TMockResponse extends EndpointLoader<TEndpoint>
>(endpoint: TEndpoint, mockResponse: TMockResponse, delay?: number) {
	const unmockingMockResponse: TMockResponse = function(...args: any) {
		unmockEndpoint(endpoint, mockResponse);
		return new Promise(resolve =>
			delay ? setTimeout(resolve, delay) : resolve()
		).then(() => (mockResponse as any).apply(null, args));
	} as any;
	const disposer = mockEndpoint<TEndpoint, TMockResponse>(
		endpoint,
		unmockingMockResponse
	);
	baseMocks.set(endpoint.loader, mockResponse);
	return disposer;
}

/**
 * unmock all active endpoints
 */
export function unmockAllEndpoints() {
	activeMocks.forEach(mockedEndpoint => {
		unmockEndpoint(mockedEndpoint);
	});
}

/**
 * Allow to group multiple mocks into one
 *
 * Usage:
 * ```
 * const mockGroup = groupMockEndpoints(mock1, mock2);
 * mockGroup.activate();
 * ```
 *
 * It is even possible to group multiple groups into one.
 */
export function groupMockEndpoints(...mocks: EndpointMock[]): EndpointMock {
	const clear = () => {
		mocks.map(mock => mock.clear());
	};
	return {
		activate: () => {
			mocks.map(mock => mock.activate());
			return clear;
		},
		clear,
	};
}

/**
 * DuckTyping helper to detect if the function is a 'GET','DELETE' or 'PUT','POST'
 */
function isEndpointFunctionWithoutBody<TEndpoint extends Endpoint>(
	endpoint: Endpoint
): endpoint is EndpointWithoutBody<
	EndpointKeys<TEndpoint>,
	EndpointResult<TEndpoint>
> {
	return endpoint.method === 'GET' || endpoint.method === 'DELETE';
}

let mockLogging = true;
/** Allow to disable logs */
export const setRequestMockLogging = (isEnabled: boolean) => {
	mockLogging = isEnabled;
};

function logRequest<TEndpoint extends Endpoint>(
	endpoint: TEndpoint,
	url: string,
	headers: {},
	result: Promise<EndpointResult<TEndpoint>>,
	body?: EndpointBody<TEndpoint>
) {
	// If logging is disabled skip this (e.g. during unit tests)
	if (!mockLogging) {
		return result;
	}
	// For nodejs skip the fake request
	/* istanbul ignore else */
	if (typeof fetch === 'undefined') {
		return result;
	} else {
		// For the browser
		// create a fake request in network panel
		return result
			.then(_fakeResponse =>
				fetch(
					`data:;url=${(url = url.replace(/[,;]/g, ''))},` +
						JSON.stringify(_fakeResponse),
					{
						method: endpoint.method,
						headers,
						...(isEndpointFunctionWithoutBody(endpoint)
							? {}
							: { body: JSON.stringify(body) }),
					}
				)
			)
			.then(_responseText => result)
			.then(
				mockResponseData =>
					groupLog(
						[
							`📨%c${endpoint.method} - %c${url}`,
							'font-weight:normal',
							'font-size: 80%; font-weight: normal',
						],
						isEndpointFunctionWithoutBody(endpoint)
							? [mockResponseData]
							: [body, mockResponseData]
					),
				error =>
					groupLog(
						[
							`📨%c${endpoint.method} - %c${url}`,
							'font-weight:normal',
							'font-size: 80%; font-weight: normal; color: red',
						],
						isEndpointFunctionWithoutBody(endpoint)
							? [error]
							: [body, error]
					)
			)
			.then(() => result);
	}
}

/**
 * Small helper for styled console logs
 */
function groupLog(entry: string[], content: any[]) {
	const isBrowser = typeof window !== 'undefined';
	const simpleMode = !isBrowser;
	const [entryText, ...entryStyles] = entry;
	const processedEntryText = simpleMode
		? (entryText || '').replace(/\%c/g, '')
		: entryText || '';
	const groupStart = simpleMode ? console.log : console.groupCollapsed;
	const groupEnd = (simpleMode ? () => {} : console.groupEnd).bind(console);
	groupStart.apply(console, [processedEntryText].concat(
		simpleMode ? [] : entryStyles
	) as any);
	content.forEach(contentRow => console.log(contentRow));
	groupEnd();
}
