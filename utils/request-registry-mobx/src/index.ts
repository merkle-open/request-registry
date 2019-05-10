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
  | { ready: false; value: undefined; state: 'loading' }
  | { ready: false; value: TResult; state: 'updating' }
  | { ready: true; value: TResult; state: 'load' };

export function createObservableEndpoint<
  TKeys extends EndpointKeys<TEndpoint>,
  TResult extends EndpointResult<TEndpoint>,
  TEndpoint extends EndpointGetFunction<any, any>
>(endpoint: TEndpoint, keys?: TKeys) {
  const mobxEndpoint = new MobxEndpoint(endpoint, keys);
  return Object.create(
    { setKeys: (keys: TKeys) => mobxEndpoint.setKeys(keys) },
    {
      value: { get: () => mobxEndpoint.value.value, set: () => {} },
      ready: { get: () => mobxEndpoint.value.ready, set: () => {} },
      state: { get: () => mobxEndpoint.value.state, set: () => {} },
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
  ready: boolean = false;

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
        this.ready = false;
        this.endpoint(this.keys).then(result => {
          // If the keys are not up to date anymore ignore the result
          if (this._cacheKey === this.endpoint.getCacheKey(this.keys)) {
            this.receiveData(result);
          }
        });
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
    this.ready = true;
  }

  get value(): EndpointState<TResult> {
    // Check if value has to be recalculated
    const currentCacheKey = this.keys
      ? this.endpoint.getCacheKey(this.keys)
      : undefined;
    if (currentCacheKey && this._cacheKey !== currentCacheKey) {
      this._cacheKey = currentCacheKey;
      if (this._value !== undefined) {
        this._value = undefined;
      }
      this.dispose();
      this.watchEndpoint();
      this.endpoint(this.keys).then(result => {
        // If the keys are not up to date anymore ignore the result
        if (this._cacheKey === currentCacheKey) {
          this.receiveData(result);
        }
      });
    }
    // Return value from cache
    const ready = this.ready;
    const value = this._value;
    if (ready && value) {
      return {
        state: 'load',
        value,
        ready,
      };
    }
    if (!ready && value) {
      return {
        state: 'updating',
        value,
        ready,
      };
    }
    return {
      state: 'loading',
      ready: false,
      value: undefined,
    };
  }
}

decorate(MobxEndpoint, {
  receiveData: action,
  keys: observable,
  ready: observable,
  _value: observable,
  setKeys: action,
  value: computed,
});
