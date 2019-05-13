# Request Registry Mobx

RequestRegistryReact is a helper to use RequestRegistry ajax endpoints with mobx.

Features:

- **lazy loading:** ajax requests will be done only if the endpoint is actively observed
- **auto refresh:** if a cache gets outdated and the endpoint is still observed it will be executed again to update the state with the latest information
- **garbage collection:** once all observers stop observing the cache will be freed

## createObservableEndpoint

The useGetEndPoint can be used to load ajax data and handling the loading state in the same component:

```js
const observedUserEndpoint = createObservableEndpoint(userEndpoint, {
  id: '1',
});
autorun(() => {
  if (observedUserEndpoint.state !== 'loading') {
    console.log(observedUserEndpoint.data);
  }
});
```
