# Request Registry React

RequestRegistryReact is a helper to use RequestRegistry ajax endpoints inside react.

Features:

-   **lazy loading:** ajax requests will be done only if a react component using the endpoint is mounted
-   **auto refresh:** if a cache gets outdated and components are still on the page they will request a new version and render again
-   **garbage collection:** once all React components using endpoints have been unmounted the cache will be freed

## Getting started

```
npm install --save request-registry registry-request-react
```

## Api

### useGetEndPoint

The useGetEndPoint can be used to load ajax data and handling the loading state in the same component:

```jsx
import { useGetEndPoint } from "request-registry-react";

const UserDetails = props => {
    const endpointState = useGetEndPoint(userEndpoint, { id: props.id });
    if (endpointState.state !== "DONE") {
        return <div>Loading...</div>;
    }
    const { name } = endpointState.value;
    return <div>{name}</div>;
};
```

### useGetEndPointSuspendable

⚠️ React.Suspense is not supported by React Server Side Rendering

The useGetEndPointSuspendable can be used in combination with `React.Suspense` to load
ajax data:

```jsx
import { useGetEndPointSuspendable } from "request-registry-react";

const UserDetails = props => {
    const { name } = useGetEndPointSuspendable(userEndpoint, { id: props.id });
    return <div>{name}</div>;
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

### useGetEndPointLazy

The `useGetEndPointLazy` can be used to load ajax data and handling the loading state in the same component
exactly like `useGetEndPoint` however the request will only be executed on client side (if the window object exists)

### preprocessing ajax values

It is possible to process the result **only once** the ajax data changed by using an optional processing function:

```jsx
const name = useGetEndPoint(userEndpoint, { id: props.id }, endpointState => {
    if (endpointState.hasValue) {
        return endpointState.value.name;
    }
});
```

### endpointState

The return value of `useGetEndPoint` can have the following states:

-   `state: 'LOADING'`: The endpoint is executed the first time or after an error occured.
-   `state: 'UPDATING'`: The endpoint is executed altough data have already been loaded before.
-   `state: 'DONE'`: The endpoint is done executing.
-   `state: 'ERROR'`: The endpoint is done executing but received an error

## License

[MIT license](http://opensource.org/licenses/MIT)
