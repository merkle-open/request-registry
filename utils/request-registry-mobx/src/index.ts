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
  | { busy: true; value: undefined; state: 'loading' }
  | { busy: true; value: TResult; state: 'updating' }
  | { busy: false; value: TResult; state: 'load' };

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
      value: { get: () => mobxEndpoint.state.value, set: noop },
      /** The observable busy state - Will be `true` while an ajax request is running */
      busy: { get: () => mobxEndpoint.state.busy, set: noop },
      /** The observable state - Will be `"loading" | "updating" | "load"` */
      state: { get: () => mobxEndpoint.state.state, set: noop },
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
  _value?: TResult;
  /** The ajax promise */
  _valuePromise?: Promise<any>;
  /** Will be true as long as an ajax request is running */
  busy: boolean = false;

  constructor(endpoint: TEndpoint, keys?: TKeys) {
    this.keys = keys;
    this.endpoint = endpoint;
    // Track the observe state of the computed this.state
    // to manage the endpoint keepInCache state
    // and to refresh the endpoint in case of a
    // cache invalidation
    onBecomeObserved(this, 'state', () => {
      this.watchEndpoint();
    });
    onBecomeUnobserved(this, 'state', () => {
      this.dispose();
    });
  }

  /** Update get request parameters */
  setKeys(keys: TKeys) {
    this.keys = keys;
  }

  /** Execute the endpoint again if the cache of the endpoint is invalidated */
  watchEndpoint() {
    // Make sure that the garbage collector does not clean up the endpoint result:
    this.disposables.push(this.endpoint.keepInCache(this.keys));
    // If the cache is cleared execute the endpoint again
    this.disposables.push(
      this.endpoint.on('cacheClear', () => {
        if (this.keys === undefined) {
          return;
        }
        this.busy = true;
        this.executeEndpoint();
      })
    );
  }

  /** Unbind all event handlers */
  dispose() {
    this.disposables.forEach(disposeFunction => disposeFunction());
  }

  /** Handle ajax response */
  receiveData(result: TResult) {
    this._value = result as TResult;
    this.busy = false;
  }

  /** The Observable State */
  get state(): EndpointState<TResult> {
    // Check if value has to be recalculated
    const currentCacheKey = this.keys
      ? this.endpoint.getCacheKey(this.keys)
      : undefined;
    if (currentCacheKey && this._cacheKey !== currentCacheKey) {
      this._cacheKey = currentCacheKey;
      this.busy = true;
      this.dispose();
      this.watchEndpoint();
      this.executeEndpoint();
    }
    // Return value from cache
    const busy = this.busy;
    const value = this._value;
    // If the endpoint is fully load
    // and no update is in progress
    if (!busy && value) {
      return {
        state: 'load',
        value,
        busy: false,
      };
    }
    // If the endpoint is fully load
    // but an update is in progress
    if (busy && value) {
      return {
        state: 'updating',
        value,
        busy: true,
      };
    }
    // If the endpoint was never load
    return {
      state: 'loading',
      busy: true,
      value: undefined,
    };
  }

  executeEndpoint() {
    // Store the ajax promise to track if this is the latest promise
    const currentPromise = (this._valuePromise = this.endpoint(this.keys).then(
      result => {
        // If the keys are not up to date anymore ignore the result
        if (currentPromise === this._valuePromise) {
          this.receiveData(result);
        }
      }
    ));
  }
}

decorate(MobxEndpoint, {
  receiveData: action,
  keys: observable,
  busy: observable,
  _value: observable,
  setKeys: action,
  state: computed,
});
