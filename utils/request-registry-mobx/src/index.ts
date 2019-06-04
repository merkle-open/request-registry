//
// This is a bridge to allow mobx components to use request-registry
//
import { EndpointGetFunction } from 'request-registry';
import {
	onBecomeObserved,
	onBecomeUnobserved,
	observable,
	decorate,
	computed,
	action,
} from 'mobx';

/* istanbul ignore next */
const noop = () => {};

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

export type ObservableEndpoint<
	TEndpoint extends EndpointGetFunction<any, any>
> = {
	setKeys: (keys: EndpointKeys<TEndpoint>) => void;
} & EndpointState<EndpointResult<TEndpoint>>;

/**
 * Create an observable Endpoint which will load data only if the endpoint is used.
 * As long as the ObservableEndpoint is observed it will execute the endpoint again if the
 * endpoint is invalidated.
 */
export function createObservableEndpoint<
	TEndpoint extends EndpointGetFunction<any, any>
>(endpoint: TEndpoint, keys?: EndpointKeys<TEndpoint>) {
	type TKeys = EndpointKeys<TEndpoint>;
	const mobxEndpoint = new MobxEndpoint(endpoint, keys);
	return Object.create(
		{
			/** Allow to set new request parameters */
			setKeys: (keys: TKeys) => mobxEndpoint.setKeys(keys),
		},
		{
			/** The observable ajax response result - Will be `undefined` before the first request finished */
			value: { get: () => mobxEndpoint.value, set: noop },
			/** The observable busy state - Will be `true` while an ajax request is running */
			busy: { get: () => mobxEndpoint.state.busy, set: noop },
			/** The observable state - Will be `"LOADING" | "UPDATING" | "LOAD" | "ERROR"` */
			state: { get: () => mobxEndpoint.state.state, set: noop },
			/** Wether the endpoint has data */
			hasData: {
				get: () => mobxEndpoint.state.hasData,
				set: noop,
			},
		}
	) as ObservableEndpoint<TEndpoint>;
}

class MobxEndpoint<
	TKeys extends EndpointKeys<TEndpoint>,
	TResult extends EndpointResult<TEndpoint>,
	TEndpoint extends EndpointGetFunction<any, any>
> {
	/** The original request-registry endpoint reference */
	endpoint: TEndpoint;
	/** Request parameters */
	keys?: TKeys;
	/** Holds all cleanup functions which should be called
      once this class becomes unobserved */
	disposables = [] as Array<() => any>;
	/** The cacheKey for the latest keys to execute the endpoint
      only if the request parameters have changed */
	_cacheKey?: string;
	/** The ajax result */
	value?: TResult;
	/** The ajax error */
	_error?: any;
	/** The ajax promise */
	_valuePromise?: Promise<any>;
	/**
	 *  Will be true as long as an ajax request is running
	 *  or if before the first ajax request has started
	 */
	busy: boolean = true;

	constructor(endpoint: TEndpoint, keys?: TKeys) {
		this.keys = keys;
		this.endpoint = endpoint;
		// Track the observe state of the observable this.value
		// which is used by the computed this.state
		// to manage the endpoint keepInCache state
		// and to refresh the endpoint in case of a
		// cache invalidation
		onBecomeObserved(this, 'value', () => {
			this.watchEndpoint();
		});
		onBecomeUnobserved(this, 'value', () => {
			this.dispose();
		});
	}

	/** Update get request parameters */
	setKeys(keys: TKeys) {
		this.keys = keys;
	}

	/** Execute the endpoint again if the cache of the endpoint is invalidated */
	watchEndpoint() {
		if (!this.keys) {
			return;
		}
		// Make sure that the garbage collector does not clean up the endpoint result:
		this.disposables.push(this.endpoint.keepInCache(this.keys));
		// If the cache is cleared execute the endpoint again
		this.disposables.push(
			this.endpoint.on('cacheClear', () => {
				if (this.keys === undefined) {
					return;
				}
				return this.executeEndpoint();
			})
		);
	}

	/** Unbind all event handlers */
	dispose() {
		this.disposables.forEach(disposeFunction => disposeFunction());
	}

	/** Handle ajax response */
	receiveData(result: TResult) {
		this.value = result as TResult;
		this.busy = false;
	}

	receiveError(err: any) {
		this._error = err;
		this.busy = false;
	}

	/** The Observable State */
	get state(): EndpointState<TResult> {
		const busy = this.busy;
		const value = this.value;
		const error = this._error;
		// Check if value has to be recalculated
		const currentCacheKey = this.keys
			? this.endpoint.getCacheKey(this.keys)
			: undefined;
		if (currentCacheKey && this._cacheKey !== currentCacheKey) {
			this._cacheKey = currentCacheKey;
			this.dispose();
			this.watchEndpoint();
			// Let mobx finish its current processing to ensure
			// that the busy state is not changed syncronously
			// from within a computed function
			this.executeEndpoint();
		}
		// Return value from cache
		const hasData = value !== undefined;
		if (error && !busy) {
			return {
				state: 'ERROR',
				value: undefined,
				hasData: false,
				busy: busy,
			};
		}
		// If the endpoint is fully load
		// and no update is in progress
		if (!busy && value) {
			return {
				state: 'DONE',
				value,
				hasData: hasData as true,
				busy: false,
			};
		}
		// If the endpoint is fully load
		// but an update is in progress
		if (busy && value) {
			return {
				state: 'UPDATING',
				value,
				hasData: hasData as true,
				busy: true,
			};
		}
		// If the endpoint was never load
		return {
			state: 'LOADING',
			busy: true,
			hasData: hasData as false,
			value: undefined,
		};
	}

	executeEndpoint() {
		let currentPromiseDone = false;
		// Store the ajax promise to track if this is the latest promise
		const currentPromise = (this._valuePromise = this.endpoint(
			this.keys
		).then(result => {
			currentPromiseDone = true;
			// If the keys are not up to date anymore ignore the result
			if (currentPromise === this._valuePromise) {
				this.receiveData(result);
			}
		}));
		currentPromise.catch(error => {
			currentPromiseDone = true;
			// If the keys are not up to date anymore ignore the result
			if (currentPromise === this._valuePromise) {
				this.receiveError(error);
			}
			return currentPromise;
		});
		// Writing to `this.busy` might happen as a side effect of
		// getState - as this must not happen synchronously wrap it
		// with a set timeout
		setTimeout(
			action(() => {
				// Ensure that this is still the correct promise
				// and that it has not been finished in the meantime
				if (
					!currentPromiseDone &&
					currentPromise === this._valuePromise
				) {
					this.busy = true;
				}
			})
		);
		return currentPromise;
	}
}

decorate(MobxEndpoint, {
	receiveData: action,
	receiveError: action,
	keys: observable,
	busy: observable,
	value: observable,
	_error: observable,
	setKeys: action,
	state: computed,
});
