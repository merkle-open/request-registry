# Request Registry Mock

Helper to create type-safe mocks for unit tests or demos similar to [fetch-mock](https://www.npmjs.com/package/fetch-mock).

## mockEndpoint

The `mockEndpoint` is the main feature of this package.  
If executed on an endpoint it will overwrite the original data fetch logic with the given one.

```js
const userEndpoint = createGetEndpoint({ url: () => '/user' });
mockEndpoint(getUserName, async () => ({ name: 'Joe' }));
console.log(await userEndpoint()); // Will return the mocked value `{name: 'Joe'}`
```

## createMockEndpoint

The `createMockEndpoint` allows to create a mock controller for an endpoint

Usage:

```js
const userJoeMock = createMockEndpoint(getUserName, async () => ({
  name: 'Joe',
}));
// Activate mock:
userJoeMock.activate();
// Deactivate mock:
userJoeMock.clear();
```

## activateMocks

Activate multiple mocks at once

Usage:

```js
const userJoeMock = createMockEndpoint(getUserName, async () => ({
  name: 'Joe',
}));
const userAgeMock = createMockEndpoint(getAgeName, async () => ({ age: 99 }));
activateMocks(userJoeMock, userAgeMock);
```

## unmockAllEndpoints

Will clear all previously activated mocks

Usage:

```js
unmockAllEndpoints();
```
