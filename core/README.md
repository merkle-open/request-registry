# RequestRegistry

RequestRegistry is a generic utility (~1.5kb gziped) to be used as part of your frontend data fetching layer to provide a typed, simplified and consistent API over various remote web services via caching.

## Getting started

RequestRegistry works with vanilla javascript.  
The optional build in typescript support will allow you to keep your data flow very maintainable.

```ts
import { createGetEndpoint } from "request-registry";

// The values needed to request the data
type Input = {
    id: string;
};
// The format the backend will provide
type Output = {
    firstName: string;
    lastName: string;
};
const userEndpoint = createGetEndpoint<Input, Output>({
    url: keys => `http://example.com/user/${keys.id}`
});

userEndpoint({ id: "4" }).then(data => console.log(data.firstName));
```

All CRUD operations are supported, for example a POST request would look like this:

```ts
import { createPostEndpoint } from "request-registry";

// The values needed to request the data
type Input = {
    id: string;
};
type Body = {
    firstName: string;
    lastName: string;
    address: string;
};
// The format the backend will provide
type Output = {
    userId: string;
};
const userEndpoint = createPostEndpoint<Input, Body, Output>({
    url: keys => `http://example.com/user/${keys.id}`
});

userEndpoint({ id: "4" }).then(data => console.log(data.firstName));
```

A PUT request would look similair:

```ts
import { createPutEndpoint } from "request-registry";

// The values needed to request the data
type Input = {
    id: string;
};
type Body = {
    firstName: string;
    lastName: string;
    address: string;
};
// The format the backend will provide
type Output = {
    userId: string;
};
const userEndpoint = createPutEndpoint<Input, Body, Output>({
    url: keys => `http://example.com/user/${keys.id}`
});

userEndpoint({ id: "4" }).then(data => console.log(data.userId));
```

And a DELETE request would not need a body type, just like the GET request:

```ts
import { createDeleteRequest } from "request-registry";

// The values needed to request the data
type Input = {
    id: string;
};
// The format the backend will provide
type Output = {
    userId: string;
};
const userEndpoint = createPutEndpoint<Input, Output>({
    url: keys => `http://example.com/user/${keys.id}`
});

userEndpoint({ id: "4" }).then(data => console.log(data.userId));
```

## Caching

Only GET operations will be cached.

```ts
const userLoader = createGetEndpoint(...)
const promise1A = userLoader.load(1)
const promise1B = userLoader.load(1)
assert(promise1A === promise1B)
```

## Clearing Cache

```ts
const userLoader = createGetEndpoint(...)
userLoader.clearCache()
```

## Disabling Cache

```ts
const userLoader = createGetEndpoint({
    url: keys => `http://example.com/user/${keys.id}`,
    cacheRequest: false
});
```

## Custom Caches

RequestRegistry can optionaly be provided a custom Map instance to use as its memoization cache. More specifically, any object that implements the methods `get()`, `set()`, `delete()` and `clear()` can be provided. This allows for custom Maps which implement various cache algorithms to be provided. By default, the standard `Map` is used which simply grows until the Endpoint is released.

```ts
const customCache = new Map();
const userLoader = createGetEndpoint({
    url: keys => `http://example.com/user/${keys.id}`,
    cache: customCache
});
```

## Custom Loaders

If you wish, you can also override the default request-registry loader. By default it executes a request, using a fetch polyfill, and returns the request promise.
You might want to do this if you don't want to actually execute a request, but are unable to mock the backend for some reason (eg. you are using Storybook).

```ts
type Input = {
    id: string;
};
type Output = {
    name: string;
};

const userEndpoint = createGetEndpoint<Input, Output>({
    url: keys => `http://example.com/user/${keys.id}`
});
userEndpoint.loader = () => Promise.resolve({ name: "I am a custom loader!" });
userEndpoint({ id: "4" }).then(data => console.log(data.name));
```

## License

[MIT license](http://opensource.org/licenses/MIT)
