# Request Registry Mobx

RequestRegistryMobx is a helper to use RequestRegistry ajax endpoints with mobx.

Features:

-   **lazy loading:** ajax requests will be done only if the endpoint is actively observed
-   **auto refresh:** if a cache gets outdated and the endpoint is still observed it will be executed again to update the state with the latest information
-   **garbage collection:** once all observers stop observing the cache will be freed

## Getting started

```
npm install --save request-registry registry-request-mobx
```

## Api

### createObservableEndpoint

The useGetEndPoint can be used to load ajax data and handling the loading state in the same component:

```js
const observedUserEndpoint = createObservableEndpoint(userEndpoint, {
    id: '1',
});
autorun(() => {
    if (observedUserEndpoint.hasData) {
        console.log(observedUserEndpoint.data);
    }
});
```

The useGetEndPoint can also be used inside a store:

```js
class Store {
    userEndpoint = createObservableEndpoint(userEndpoint);

    setUserId(id: string) {
        this.userEndpoint.setKeys({ id: string });
    }

    get userName() {
        return this.userEndpoint.hasData ? this.userEndpoint.name : undefined;
    }
}

const store = new Store();
store.setUserId(1);

autorun(() => {
    console.log(store.userName);
});
```

### endpointState

The return value of `createObservableEndpoint` can have the following states:

-   `state: 'LOADING'`: The endpoint is executed the first time or after an error occured.
-   `state: 'UPDATING'`: The endpoint is executed altough data have already been loaded before.
-   `state: 'DONE'`: The endpoint is done executing.
-   `state: 'ERROR'`: The endpoint is done executing but received an error

## License

[MIT license](http://opensource.org/licenses/MIT)
