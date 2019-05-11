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

export function createObservableEndpoint<
  TKeys extends EndpointKeys<TEndpoint>,
  TResult extends EndpointResult<TEndpoint>,
  TEndpoint extends EndpointGetFunction<any, any>
>(endpoint: TEndpoint, keys?: TKeys) {
  const mobxEndpoint = new MobxEndpoint(endpoint, keys);
  return Object.create(
    { setKeys: (keys: TKeys) => mobxEndpoint.setKeys(keys) },
    {
      value: { get: () => mobxEndpoint.value.value, set: noop },
      busy: { get: () => mobxEndpoint.value.busy, set: noop },
      state: { get: () => mobxEndpoint.value.state, set: noop },
    }
  ) as { setKeys: (keys: TKeys) => void } & EndpointState<TResult>;
}

class MobxEndpoint<
  TKeys extends EndpointKeys<TEndpoint>,
  TResult extends EndpointResult<TEndpoint>,
  TEndpoint extends EndpointGetFunction<any, any>
> {
  endpoint: TEndpoint;
  keys?: TKeys;
  disposables = [] as Array<() => any>;
  _cacheKey?: string;
  _value?: TResult;
  _endpointPromise?: Promise<any>;
  busy: boolean = false;

  constructor(endpoint: TEndpoint, keys?: TKeys) {
    this.keys = keys;
    this.endpoint = endpoint;
    this.hooks();
  }
  hooks() {
    onBecomeObserved(this, 'value', () => {
      this.watchEndpoint();
    });
    onBecomeUnobserved(this, 'value', () => {
      this.dispose();
    });
  }
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

  get value(): EndpointState<TResult> {
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
    const currentPromise = (this._endpointPromise = this.endpoint(
      this.keys
    ).then(result => {
      // If the keys are not up to date anymore ignore the result
      if (currentPromise === this._endpointPromise) {
        this.receiveData(result);
      }
    }));
  }
}

decorate(MobxEndpoint, {
  receiveData: action,
  keys: observable,
  busy: observable,
  _value: observable,
  setKeys: action,
  value: computed,
});
