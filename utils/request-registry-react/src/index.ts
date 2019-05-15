//
// This is a bridge to allow react components to use request-registry
//
import { EndpointGetFunction } from "request-registry";
import { useEffect, useRef, useReducer, useCallback } from "react";

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

/**
 * Get the data from the given endpoint and caches the result as long as the component is mounted
 */
export function useGetEndPoint<TEndpoint extends EndpointGetFunction<any, any>>(
  endpoint: TEndpoint,
  keys: EndpointKeys<TEndpoint>
) {
  // Allow effects to access the latest key values
  const latestKeys = useRef(keys);
  // Helper to start ajax loading
  const executeEndpoint = useCallback(() => {
    const currendEndpointPromise = endpoint(latestKeys.current);
    currendEndpointPromise.then(
      result => {
        updateEndpointState({
          type: "receiveData",
          promise: currendEndpointPromise,
          value: result
        });
      },
      error => {
        updateEndpointState({
          type: "receiveError",
          promise: currendEndpointPromise,
          value: error
        });
        return Promise.reject(error);
      }
    );
    return currendEndpointPromise;
  }, []);
  const [endpointState, updateEndpointState] = useEndpointStateReduce<
    TEndpoint
  >(executeEndpoint);
  latestKeys.current = keys;
  // Whenever the cache is invalid
  // and this component is still mounted
  // execute the endpoint again
  useEffect(
    () =>
      endpoint.on("cacheClear", () => {
        const newEndpointPromise = executeEndpoint();
        updateEndpointState({
          type: "executeAjax",
          promise: newEndpointPromise
        });
        return newEndpointPromise;
      }),
    [endpoint]
  );
  // Whenever the keys change execute the endpoints again
  useEffect(() => {
    updateEndpointState({ type: "executeAjax", promise: executeEndpoint() });
    // Track this hook as endpoint consumer
    // once all consumers are gone the memory will be freed
    return endpoint.keepInCache(latestKeys.current);
  }, [endpoint, ...turnObjectInDiffableArray(keys)]);
  return endpointState;
}

// Suspense will unmount the component while it is loading
// Therefore the promise result is storred in a WeakMap instead
// of a useRef, useState or useReduce helper
const suspenseCache = new WeakMap<
  Promise<unknown>,
  { promise: unknown; value?: unknown; error?: unknown }
>();
/**
 * Provide a hook which works with React.Suspense
 */
export function useGetEndPointSuspendable<
  TKeys extends EndpointKeys<TEndpoint>,
  TResult extends EndpointResult<TEndpoint>,
  TEndpoint extends EndpointGetFunction<any, any>
>(endpoint: TEndpoint, keys: TKeys): TResult {
  const endpointData = useGetEndPoint<TEndpoint>(endpoint, keys);
  if (endpointData.state === "ERROR") {
    throw new Error("Endpoint failed");
  }
  if (endpointData.state === "LOADING" || endpointData.state === "UPDATING") {
    // Use the suspense cache to detect if the promise is already loaded
    // this works only because endpointData.promise wil get the same promise
    // from the request-registry cache
    const suspenseCacheEntry = suspenseCache.get(endpointData.promise) || {
      promise: endpointData.promise
        .then(
          value => {
            suspenseCacheEntry.value = value;
          },
          error => {
            suspenseCacheEntry.error = error;
          }
        )
        .then(() => endpointData.promise)
    };
    suspenseCache.set(endpointData.promise, suspenseCacheEntry);
    // Check if the suspense cache could retrieve a value or an error
    if (suspenseCacheEntry.value) {
      return suspenseCacheEntry.value as TResult;
    }
    if (suspenseCacheEntry.error) {
      throw new Error("Endpoint failed");
    }
    // If the value and error aren't loaded
    // throw the promise to tell react to rerender once the
    // suspense cache has data
    throw suspenseCacheEntry.promise;
  }
  return endpointData.value;
}

/**
 * React memo/effects needs an array for propper diffing
 * This function turns a flat object into an array
 * E.g. {'a':1, 'b': 2} -> ['a', 'b', 1, 2]
 */
function turnObjectInDiffableArray<TObject extends {}>(
  obj: TObject
): Array<unknown> {
  const keys = Object.keys(obj) as Array<keyof TObject>;
  return keys.concat(keys.map(key => obj[key]) as any);
}

type EndpointState<TResult> =
  | {
      busy: true;
      value: undefined;
      state: "LOADING";
      hasData: false;
      promise: Promise<TResult>;
    }
  | {
      busy: false;
      value: undefined;
      state: "ERROR";
      hasData: false;
      promise: Promise<TResult>;
    }
  | {
      busy: true;
      value: TResult;
      state: "UPDATING";
      hasData: true;
      promise: Promise<TResult>;
    }
  | {
      busy: false;
      value: TResult;
      state: "DONE";
      hasData: true;
      promise: Promise<TResult>;
    };

const initialEndpointState = <TEndpoint extends EndpointGetFunction<any, any>>(
  initialLoad: () => Promise<EndpointResult<TEndpoint>>
): EndpointState<TEndpoint> => ({
  busy: true,
  value: undefined,
  state: "LOADING",
  hasData: false,
  promise: initialLoad()
});

type EndpointActions<TEndpoint extends EndpointGetFunction<any, any>> =
  | {
      type: "executeAjax";
      promise: Promise<EndpointResult<TEndpoint>>;
    }
  | {
      type: "receiveData";
      value: EndpointResult<TEndpoint>;
      promise: Promise<EndpointResult<TEndpoint>>;
    }
  | {
      type: "receiveError";
      value: any;
      promise: Promise<EndpointResult<TEndpoint>>;
    };

function endpointStateReducer<TEndpoint extends EndpointGetFunction<any, any>>(
  state: EndpointState<TEndpoint>,
  action: EndpointActions<TEndpoint>
): EndpointState<TEndpoint> {
  if (action.type === "executeAjax") {
    if (!state.hasData)
      return {
        promise: action.promise,
        state: "LOADING",
        busy: true,
        hasData: false,
        value: undefined
      };
    return {
      promise: action.promise,
      state: "UPDATING",
      busy: true,
      hasData: true,
      value: state.value
    };
  }
  // Keep the same state if the promise is not upto date anymore
  if (state.promise !== action.promise) {
    return state;
  }
  switch (action.type) {
    case "receiveData":
      return {
        ...state,
        state: "DONE",
        busy: false,
        hasData: true,
        value: action.value
      };
    case "receiveError":
      return {
        ...state,
        state: "ERROR",
        busy: false,
        hasData: false,
        value: undefined
      };
    /* istanbul ignore next */
    default:
      let unhandledAction: never = action;
      throw String(unhandledAction);
  }
}
function useEndpointStateReduce<
  TEndpoint extends EndpointGetFunction<any, any>
>(initialLoad: () => Promise<EndpointResult<TEndpoint>>) {
  return useReducer(
    endpointStateReducer,
    initialLoad,
    initialEndpointState
  ) as [
    EndpointState<EndpointResult<TEndpoint>>,
    (
      action: EndpointActions<TEndpoint>
    ) => EndpointState<EndpointResult<TEndpoint>>
  ];
}
