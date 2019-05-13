# Request Registry React

RequestRegistryReact is a helper to use RequestRegistry ajax endpoints inside react.

Features:

- **lazy loading:** ajax requests will be done only if a react component using the endpoint is mounted
- **auto refresh:** if a cache gets outdated and components are still on the page they will request a new version and render again
- **garbage collection:** once all React components using endpoints have been unmounted the cache will be freed

## useGetEndPoint

The useGetEndPoint can be used to load ajax data and handling the loading state in the same component:

```jsx
const UserDetails = props => {
  const endpointState = useGetEndPoint(userEndpoint, { id: props.id });
  if (endpointState.state === "loading") {
    return <div>Loading...</div>;
  }
  const userData = endpointState.data;
  return <div>{userData.name}</div>;
};
```

## useGetEndPointSuspendable

The useGetEndPointSuspendable can be used in combination with `React.Suspense` to load
ajax data:

```jsx
const UserDetails = props => {
  const userData = useGetEndPointSuspendable(userEndpoint, { id: props.id });
  return <div>{userData.name}</div>;
};
```

```jsx
const UserDetailsContainer = () => {
  return (
    <Suspense fallback={"Loading..."}>
      <UserDetails id="4" />
    </Suspense>
  );
};
```
