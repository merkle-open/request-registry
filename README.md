# RequestRegistry

RequestRegistry is a generic utility (~1kb gziped) to be used as part of your frontend data fetching layer to provide a typed, simplified and consistent API over various remote web services via caching.

## Getting started

RequestRegistry works with vanilla javascript.  
The optional build in typescript support will allow you to keep your data flow very maintainable.

```js
import { createGetEndpoint } from 'request-registry';

// The values needed to request the data
type Input = {
  id: string
};
// The format the backend will provide
type Output = {
  firstName: string, 
  lastName: string
};
const userEndpoint = createGetEndpoint<Input, Output>({
  url: (keys) => `http://example.com/user/${keys.id}`
})

userEndpoint({ id: '4' })
  .then((data) => console.log(data.firstName))
```

## Caching

```js
const userLoader = createGetEndpoint(...)
const promise1A = userLoader.load(1)
const promise1B = userLoader.load(1)
assert(promise1A === promise1B)
```

## Clearing Cache

```js
const userLoader = createGetEndpoint(...)
userLoader.clearCache()
```

## Disabling Cache

```js
const userLoader = createGetEndpoint({
  url: (keys) => `http://example.com/user/${keys.id}`,
  cacheRequest: false
})
```

## Custom Caches

RequestRegistry can optionaly be provided a custom Map instance to use as its memoization cache. More specifically, any object that implements the methods get(), set(), delete() and clear() can be provided. This allows for custom Maps which implement various cache algorithms to be provided. By default, DataLoader uses the standard Map which simply grows until the Endpoint is released. 

```js
const customCache = new Map();
const userLoader = createGetEndpoint({
  url: (keys) => `http://example.com/user/${keys.id}`,
  cache: customCache
})
```
