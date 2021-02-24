//
// This is a bridge to allow react components to use request-registry
//
import { EndpointGetFunction } from "request-registry";
import { useEffect, useRef, useReducer, useCallback, useMemo } from "react";

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
 *
 * The keys object has to be passed only if it contains a value
 */
export function useGetEndPoint<
	TEndpoint extends EndpointGetFunction<
		{ [key: string]: never | undefined },
		any
	>
>(endpoint: TEndpoint): EndpointState<EndpointResult<TEndpoint>>;
export function useGetEndPoint<TEndpoint extends EndpointGetFunction<any, any>>(
	endpoint: TEndpoint,
	keys: EndpointKeys<TEndpoint>,
	executeAjax?: boolean,
	catchErrors?: boolean
): EndpointState<EndpointResult<TEndpoint>>;
export function useGetEndPoint<TEndpoint extends EndpointGetFunction<any, any>>(
	endpoint: TEndpoint,
	keysArg?: EndpointKeys<TEndpoint>,
	executeAjax?: boolean,
	catchErrors?: boolean
): EndpointState<EndpointResult<TEndpoint>> {
	// Allow effects to access the latest key values
	const keys = keysArg || {};
	const latestKeys = useRef(keys);
	// Don't submit this endpoint if it is not enabled
	// because of `!== false` it is set to true by default
	const isEndpointEnabled = executeAjax !== false;
	// Promise to wait for executeAjax to be true for the first time
	// This is neccessary to postpone the initial ajax execution
	const [
		endpointBecomesEnabledPromise,
		endpointEnabledState
	] = useWaitForValuePromise(isEndpointEnabled, enabled => enabled);
	// Calculate the cacheKey only if the keys change
	// empty keys are threaten as null to make sure as
	// in javascript `{} !== {}` but `null === null`
	const cacheKey = useMemo(() => endpoint.getCacheKey(keys), [
		Object.keys(keys).length ? keys : null
	]);
	latestKeys.current = keys;
	// Helper to start ajax loading
	const executeEndpoint = useCallback(() => {
		// Once the endpoint is enabeld return the endpoint(latestKeys.current)
		// from cache to prevent endless loops during suspense
		const currendEndpointPromise = endpointEnabledState.done
			? endpoint(latestKeys.current)
			: endpointBecomesEnabledPromise.then(() =>
					endpoint(latestKeys.current)
			  );
		// Once data is received update the internal hook state
		currendEndpointPromise.then(
			result => {
				updateEndpointState({
					type: "receiveData",
					promise: currendEndpointPromise,
					value: result
				});
			},
			(error): any => {
				updateEndpointState({
					type: "receiveError",
					promise: currendEndpointPromise,
					value: error
				});
				if (!catchErrors) {
					return Promise.reject(error);
				}
			}
		);
		return currendEndpointPromise;
	}, []);
	const [endpointState, updateEndpointState] = useEndpointStateReduce<
		TEndpoint
	>(executeEndpoint);
	// Whenever the keys change execute the endpoints again
	useEffect(() => {
		if (!isEndpointEnabled) {
			return;
		}
		// Track this hook as endpoint consumer
		// once all consumers are gone the memory will be freed
		return endpoint.observePromise(latestKeys.current, () => {
			const result = executeEndpoint();
			updateEndpointState({
				type: "executeAjax",
				promise: executeEndpoint()
			});
			return result;
		});
	}, [endpoint, cacheKey, isEndpointEnabled]);
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
 * Get the data from the given endpoint and caches the result as long as the component is mounted
 *
 * Will be executed only client side in the Browser
 *
 * The keys object has to be passed only if it contains a value
 */
export function useGetEndPointLazy<
	TEndpoint extends EndpointGetFunction<
		{ [key: string]: never | undefined },
		any
	>
>(endpoint: TEndpoint): EndpointState<EndpointResult<TEndpoint>>;
export function useGetEndPointLazy<
	TEndpoint extends EndpointGetFunction<any, any>
>(
	endpoint: TEndpoint,
	keys: EndpointKeys<TEndpoint>,
	executeAjax?: boolean
): EndpointState<EndpointResult<TEndpoint>>;
export function useGetEndPointLazy<
	TEndpoint extends EndpointGetFunction<any, any>
>(
	endpoint: TEndpoint,
	keys?: EndpointKeys<TEndpoint>,
	executeAjax?: boolean
): EndpointState<EndpointResult<TEndpoint>> {
	const serverSideState: EndpointState<EndpointResult<TEndpoint>> = {
		busy: true,
		value: undefined,
		state: "LOADING",
		hasData: false,
		error: undefined,
		promise: new Promise(() => {})
	};
	return typeof window === "undefined"
		? serverSideState
		: useGetEndPoint(
				endpoint,
				keys as EndpointKeys<TEndpoint>,
				executeAjax
		  );
}

type EndpointState<TResult> =
	| {
			busy: true;
			value: undefined;
			state: "LOADING";
			hasData: false;
			error: undefined;
			promise: Promise<TResult>;
	  }
	| {
			busy: false;
			value: undefined;
			state: "ERROR";
			hasData: false;
			error: unknown;
			promise: Promise<TResult>;
	  }
	| {
			busy: true;
			value: TResult;
			state: "UPDATING";
			hasData: true;
			error: undefined;
			promise: Promise<TResult>;
	  }
	| {
			busy: false;
			value: TResult;
			state: "DONE";
			hasData: true;
			error: undefined;
			promise: Promise<TResult>;
	  };

const initialEndpointState = <TEndpoint extends EndpointGetFunction<any, any>>(
	initialLoad: () => Promise<EndpointResult<TEndpoint>>
): EndpointState<TEndpoint> => ({
	busy: true,
	value: undefined,
	state: "LOADING",
	hasData: false,
	error: undefined,
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
				error: undefined,
				hasData: false,
				value: undefined
			};
		return {
			promise: action.promise,
			state: "UPDATING",
			busy: true,
			hasData: true,
			error: state.error,
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
				error: undefined,
				value: action.value
			};
		case "receiveError":
			return {
				...state,
				state: "ERROR",
				busy: false,
				hasData: false,
				error: action.value,
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

function useWaitForValuePromise<T extends any>(
	value: T,
	conditionFunction: (value: T) => boolean
) {
	const [promise, resolve, ref] = useMemo(() => {
		const refObject = { done: conditionFunction(value) };
		let innerResolve: undefined | ((value: T) => void) = undefined as
			| undefined
			| ((value: T) => void);
		const promise = new Promise<T>(resolve => {
			innerResolve = resolve;
		});
		if (refObject.done) {
			return [Promise.resolve(value), innerResolve, refObject] as const;
		}
		return [promise, innerResolve, refObject] as const;
	}, []);
	useEffect(() => {
		if (resolve && !ref.done) {
			ref.done = conditionFunction(value);
			if (ref.done) {
				resolve(value);
			}
		}
	}, [value]);
	return [promise, ref] as const;
}
