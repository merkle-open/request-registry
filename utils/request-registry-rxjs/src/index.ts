//
// This is a bridge to allow rxjs observers to use request-registry
//
import { EndpointGetFunction } from 'request-registry';
import { Observable, Observer } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

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

type EndpointState<TResult> =
	| { busy: true; value: undefined; state: 'LOADING'; hasData: false }
	| { busy: false; value: undefined; state: 'ERROR'; hasData: false }
	| { busy: true; value: TResult; state: 'UPDATING'; hasData: true }
	| { busy: false; value: TResult; state: 'DONE'; hasData: true };

/**
 * Returns an Observable for the endpoint staten
 */
export const createObservableEndpoint = function createObservableEndpoint<
	TEndpoint extends EndpointGetFunction<any, any>
>(
	endpoint: TEndpoint,
	keys: EndpointKeys<TEndpoint>
): Observable<EndpointState<EndpointResult<TEndpoint>>> {
	return new Observable(
		(observer: Observer<EndpointState<EndpointResult<TEndpoint>>>) => {
			let endpointPromise: Promise<EndpointResult<TEndpoint>> | undefined;
			let lastResult: EndpointResult<TEndpoint> | undefined;

			observer.next({
				busy: true,
				value: undefined,
				state: 'LOADING',
				hasData: false,
			});

			return endpoint.observePromise(keys, () => {
				if (lastResult) {
					observer.next({
						busy: true,
						value: lastResult,
						state: 'UPDATING',
						hasData: true,
					});
				}
				const currentPromise = endpoint(keys);
				endpointPromise = currentPromise;
				endpointPromise
					.then(result => {
						if (currentPromise !== endpointPromise) {
							return;
						}
						lastResult = result;
						observer.next({
							busy: false,
							value: result,
							state: 'DONE',
							hasData: true,
						});
					})
					.catch(() => {
						if (currentPromise !== endpointPromise) {
							return;
						}
						lastResult = undefined;
						observer.next({
							busy: false,
							value: undefined,
							state: 'ERROR',
							hasData: false,
						});
						return currentPromise;
					});
			});
		}
	);
};

/**
 * Returns an Observable for the endpoint result
 */
export function createObservableEndpointResponse<
	TEndpoint extends EndpointGetFunction<any, any>
>(endpoint: TEndpoint, keys: EndpointKeys<TEndpoint>) {
	return createObservableEndpoint(endpoint, keys).pipe(
		tap(state => {
			if (state.state === 'ERROR') throw new Error();
		}),
		filter(state => state.state === 'DONE'),
		map(state => state.value as EndpointResult<TEndpoint>)
	);
}
