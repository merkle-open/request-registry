//
// This is a dev util to allow mocking during development
//
import { EndpointGetFunction } from 'request-registry';
type EndpointKeys<
  TEndpointGetFunction
> = TEndpointGetFunction extends EndpointGetFunction<infer TKeys, any>
  ? TKeys
  : never;
type EndpointResult<
  TEndpointGetFunction
> = TEndpointGetFunction extends EndpointGetFunction<any, infer TResult>
  ? TResult
  : never;

type LoaderFunction = ((
  keys: any,
  url: string,
  headers: { [key: string]: string }
) => Promise<any>) & {
  baseMock?: (
    keys: any,
    url: string,
    headers: { [key: string]: string }
  ) => Promise<any>;
};

/**
 * Helper to store all original loader functions to revert back to the original
 */
const originalLoaders = new WeakMap<
  EndpointGetFunction<any, any>,
  LoaderFunction[]
>();
/**
 * Set of all currently active mocks
 */
const activeMocks = new Set<EndpointGetFunction<any, any>>();

const baseMocks = new WeakMap<LoaderFunction, LoaderFunction>();

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
  TEndpoint extends EndpointGetFunction<any, any>,
  TKeys extends EndpointKeys<TEndpoint>,
  TResult extends EndpointResult<TEndpoint>,
  TMock extends (keys: TKeys, url: string) => Promise<TResult>
>(endpoint: TEndpoint, mockResponse: TMock, delay?: number) {
  return {
    activate: () =>
      mockEndpoint<TEndpoint, TMock>(endpoint, mockResponse, delay),
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
  TEndpoint extends EndpointGetFunction<any, any>,
  TMock extends (
    keys: EndpointKeys<TEndpoint>,
    url: string
  ) => Promise<EndpointResult<TEndpoint>>
>(endpoint: TEndpoint, mockResponse: TMock, delay?: number) {
  // Remember the previous loader
  const originalLoadersOfEndpoint = originalLoaders.get(endpoint) || [];
  originalLoadersOfEndpoint.push(endpoint.loader);
  activeMocks.add(endpoint);
  // If the array is new add it to the map
  if (originalLoadersOfEndpoint.length === 1) {
    originalLoaders.set(endpoint, originalLoadersOfEndpoint);
  }
  endpoint.loader = function(_keys, url) {
    const args = arguments;
    const mockResult = new Promise(resolve => setTimeout(resolve, delay)).then(
      () => mockResponse.apply(this, args as any)
    );
    // For nodejs skip the fake request
    /* istanbul ignore else */
    if (typeof fetch === 'undefined') {
      return mockResult;
    } else {
      // For the browser
      // create a fake request in network panel
      return mockResult
        .then(_fakeResponse =>
          fetch(`data:;url=${(url = url.replace(/[,;]/g, ''))},`)
        )
        .then(_responseText => {
          return mockResult;
        });
    }
  };
  // Add the original mockFunction to find it during cleanup
  baseMocks.set(endpoint.loader, mockResponse);
  // Return the dispose function
  return unmockEndpoint.bind(null, endpoint, endpoint.loader);
}

function getBaseMock(loaderFunction: LoaderFunction) {
  return baseMocks.get(loaderFunction);
}

/**
 * Reverts back to the original endpoint behaviour
 */
function unmockEndpoint(
  endpoint: EndpointGetFunction<any, any>,
  loaderFunction?: LoaderFunction
) {
  const originalLoadersOfEndpoint = originalLoaders.get(endpoint) || [];
  if (getBaseMock(endpoint.loader) === loaderFunction) {
    // If this endpoint is active remove it and activate the next in queue
    const previousLoader = originalLoadersOfEndpoint.pop();
    /* istanbul ignore else */
    if (previousLoader) {
      endpoint.loader = previousLoader;
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
  TEndpoint extends EndpointGetFunction<any, any>,
  TMock extends (
    keys: EndpointKeys<TEndpoint>,
    url: string
  ) => Promise<EndpointResult<TEndpoint>>
>(endpoint: TEndpoint, mockResponse: TMock, delay?: number) {
  const disposer = mockEndpoint<TEndpoint, TMock>(
    endpoint,
    function(...args: any) {
      unmockEndpoint(endpoint, mockResponse);
      return mockResponse.apply(null, args);
    } as TMock,
    delay
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
