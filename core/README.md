# RequestRegistry

[![NPM version][npm-image]][npm-url]
[![Size][size-image]][size-url]
[![License][license-image]][license-url]
[![Commitizen friendly][commitizen-image]][commitizen-url]

RequestRegistry is a minimal generic utility (~1.5kb gziped) to be used as part of your frontend data fetching layer to provide a typed, simplified and consistent API over various remote web services via caching.

## Goals

-   Only ~1.5kb gziped (optimizable to 1kb with tree shaking)
-   Framework independent
-   Typesave

## Getting started

```ts
import { createGetEndpoint } from "request-registry";

// Define a service endpoint to load user information
const userEndpoint = createGetEndpoint({
    url: keys => `http://example.com/user/${keys.id}`
});

// Load user information
const user = await userEndpoint({ id: "4" });
console.log(user.firstName);
```

## Intellisense

![intellisense demo](https://raw.githubusercontent.com/namics/request-registry/master/code.jpg)

The optional build in typescript support will allow you to keep your data flow more maintainable
as it allows you to understand which data has to be send and which data will be returned

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
// The next lines will be fully typesafe without the need of adding any types
const data = await userEndpoint({ id: "4" });
console.log(data.firstName);
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
const updateUserEndpoint = createPostEndpoint<Input, Body, Output>({
    url: keys => `http://example.com/user/${keys.id}`
});

updateUserEndpoint({ id: "4" }, {firstName: 'Alex', lastName 'Doe', address: 'Earth'})
    .then(data => console.log(data.userId));
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
const putUserEndpoint = createPutEndpoint<Input, Body, Output>({
    url: keys => `http://example.com/user/${keys.id}`
});

putUserEndpoint({ id: "4" }, {firstName: 'Alex', lastName 'Doe', address: 'Earth'})
    .then(data => console.log(data.userId));
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

## GraphQL

Request registry is capable of sending and caching GraphQL requests:

```ts
import { createGraphQlEndpoint } from "request-registry";

const query = `{
  Movie(title: "Inception") {
    releaseDate
    actors {
      name
    }
  }
}`;
const actorsEndpoint = createGraphQlEndpoint<{}, {}>({
    url: keys => `http://example.com/user/${keys.id}`,
    query: query
});

actorsEndpoint().then(graphQLResponse => console.log(graphQLResponse));
```

## Caching

The build in caching allows executing the same endpoint multiple times
without sending duplicated requests.

Only GET and GraphQL operations will be cached by default.

```ts
const userLoader = createGetEndpoint(...)
const promise1A = userLoader.load(1)
const promise1B = userLoader.load(1)
assert(promise1A === promise1B)
```

## Clearing Cache

Clearing the cache will also trigger a clear cache event which
can be used to rerender outdated components

```ts
const userLoader = createGetEndpoint(...)
userLoader.refresh()
```

## Disabling Cache

Caching can be disabled for cases where you always need a fresh result

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

## Connecting Caches

Most of the time mutiation endpoints (POST / PUT / DELTE) influence the validity of data endpoints (GET).
For example setting a users name should invalidate all caches including the old name.  
RequestRegistry allows to define those relations for every endpoint using the `afterSuccess` hook:

```ts
const getUserName = createGetEndpoint({
    url: keys => `http://example.com/user/${keys.id}/get`,
})
const setUserName = createPostEndpoint({
    url: keys => `http://example.com/user/${keys.id}/update`,
    afterSuccess: () => getUserName.refresh();
})
```

## Custom Headers

The `headers` option allows to customize request headers.

```ts
const userLoader = createGetEndpoint({
    url: keys => `http://example.com/user/${keys.id}`,
    headers: {
        Authorization: keys => `Bearer ${keys.token}`,
        contentType: "application/json"
    }
});
userLoader({ id: 9, token: "YXRvYmF0b2JhdG9i" });
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

## Success handling

The `afterSuccess` options allows to add a generic success handling for an endpoint.

```ts
type Input = {
    id: string;
};
type Output = {
    name: string;
};

const userEndpoint = createGetEndpoint<Input, Output>({
    url: keys => `http://example.com/user/${keys.id}`
    afterSuccess: (result) => {
        console.log("Load data", result);
    }
});
```

## Error handling

The `afterError` options allows to add a generic error reporting for an endpoint.

```ts
type Input = {
    id: string;
};
type Output = {
    name: string;
};

const userEndpoint = createGetEndpoint<Input, Output>({
    url: keys => `http://example.com/user/${keys.id}`
    afterError: (error) => {
        console.error("Request failed", error);
    }
});
```

## Endpoint observing

Invalidating the cache using `refresh` will internaly trigger a refresh event.  
To subscribe to the initial data load and updates after a clear cache it is possible to observe an endpoint:

```js
const userEndpoint = createGetEndpoint({
    url: keys => `http://example.com/user/${keys.id}`
});
const stopObserving = userEndpoint.observe(latestValue => {
    // Output the user data intially and on every cache clear:
    console.log(latestValue);
});
```

To unsubscribe just execute the function returned by the `observe` function:

```js
stopObserving();
```

## Framework integration

Although `request-registry` can be used standalone there are some unit tested packages to help with framework integrations:

-   [request-registry-react](https://www.npmjs.com/package/request-registry-react)
-   [request-registry-rxjs](https://www.npmjs.com/package/request-registry-rxjs)
-   [request-registry-mobx](https://www.npmjs.com/package/request-registry-mobx)

## License

[MIT license](http://opensource.org/licenses/MIT)

[npm-image]: https://badge.fury.io/js/request-registry.svg
[npm-url]: https://npmjs.org/package/request-registry
[license-image]: https://img.shields.io/badge/license-MIT-green.svg
[license-url]: http://opensource.org/licenses/MIT
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
[size-image]: https://img.shields.io/bundlephobia/minzip/request-registry.svg
[size-url]: https://bundlephobia.com/result?p=request-registry
