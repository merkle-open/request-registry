# Request Registry RXJS

RequestRegistryRXJS is a helper to use RequestRegistry ajax endpoints with rxjs.

Features:

-   **lazy loading:** ajax requests will be done only if the endpoint is actively observed
-   **auto refresh:** if a cache gets outdated and the endpoint is still observed it will be executed again to update the state with the latest information
-   **garbage collection:** once all observers stop observing the cache will be freed

## Getting started

```
npm install --save request-registry registry-request-rjxs
```

## Api

### createObservableEndpoint

The `createObservableEndpoint` can be used to load ajax data and handling the loading state in the same component:

```js
const userEndpoint = createGetEndpoint<{ id: string }, { name: string; age: number }>({
  url: keys => `/user/${keys.id}`,
});
const observedUserEndpoint$ = createObservableEndpoint(userEndpoint, {
  id: '1',
});
const subscription = observedUserEndpoint$.subscribe(val => console.log(val));
```

### endpointState

The return value of `createObservableEndpoint` can have the following states:

-   `state: 'LOADING'`: The endpoint is executed the first time or after an error occured.
-   `state: 'UPDATING'`: The endpoint is executed altough data have already been loaded before.
-   `state: 'DONE'`: The endpoint is done executing.
-   `state: 'ERROR'`: The endpoint is done executing but received an error

## License

[MIT license](http://opensource.org/licenses/MIT)
