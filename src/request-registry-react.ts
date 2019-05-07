//
// This is a bridge to allow react components to use request-registry
//
import { EndpointGetFunction } from ".";
import { useEffect, useRef, useState } from "react";

type EndpointKeys<
  TEndpointGetFunction
> = TEndpointGetFunction extends EndpointGetFunction<infer TKeys, infer TResult>
  ? TKeys
  : never;
type EndpointResult<
  TEndpointGetFunction
> = TEndpointGetFunction extends EndpointGetFunction<infer TKeys, infer TResult>
  ? TResult
  : never;

/**
 * Get the data from the given endpoint and caches the result as long as the component is mounted
 */
export function useGetEndPoint<
  TKeys extends EndpointKeys<TEndpoint>,
  TResult extends EndpointResult<TEndpoint>,
  TEndpoint extends EndpointGetFunction<any, any>
>(endpoint: TEndpoint, keys: TKeys) {
  // Allow effects to access the latest key values
  const latestKeys = useRef(keys);
  const [endpointPromise, setEndpointPromise] = useState<Promise<
    TResult
  > | null>(null);
  const [endpointResult, setEndpointResult] = useState<TResult | null>(null);
  latestKeys.current = keys;
  // Whenever the cache is invalid
  // and this component is still mounted
  // execute the endpoint again
  useEffect(
    () =>
      endpoint.on("cacheClear", () => {
        const newEndpointPromise = endpoint(latestKeys.current);
        setEndpointPromise(newEndpointPromise);
      }),
    [endpoint]
  );
  // Whenever the keys change execute the endpoints again
  useEffect(() => {
    let componentIsWaitingForPromise = true;
    if (endpointPromise) {
      endpointPromise.then(result => {
        // Stop if this effect instance was already cleanded up
        if (!componentIsWaitingForPromise) {
          return;
        }
        setEndpointResult(result);
      });
    }
    setEndpointPromise(endpointPromise);
    // If useEffect cleans up store that a promise result
    // should not be used anymore
    return () => {
      componentIsWaitingForPromise = false;
    };
  }, [endpointPromise]);
  // Whenever the keys change execute the endpoints again
  useEffect(() => {
    const newEndpointPromise = endpoint(latestKeys.current);
    setEndpointPromise(newEndpointPromise);
    // Track this hook as endpoint consumer
    // once all consumers are gone the memory will be freed
    return endpoint.keepInCache(latestKeys.current);
  }, [endpoint, ...turnObjectInDiffableArray(keys)]);

  return endpointResult === null
    ? ({ state: "loading" } as const)
    : ({
        state: "load",
        data: endpointResult
      } as const);
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
