# Request Registry Mock

Helper to create type-safe mocks for unit tests or demos similar to [fetch-mock](https://www.npmjs.com/package/fetch-mock).

## Getting started

```
npm install --save-dev registry-request-mock
```

## Api

### mockEndpoint

The `mockEndpoint` is the main feature of this package.  
If executed on an endpoint it will overwrite the original data fetch logic with the given one.

```js
const userEndpoint = createGetEndpoint({ url: () => '/user' });
mockEndpoint(getUserName, async () => ({ name: 'Joe' }));
console.log(await userEndpoint()); // Will return the mocked value `{name: 'Joe'}`
```

### createMockEndpoint

The `createMockEndpoint` allows to create a mock controller for an endpoint

#### simple usage:

```js
const userJoeMock = createMockEndpoint(getUserName, async () => ({
    name: 'Joe',
}));
// Activate mock:
userJoeMock.activate();
// Deactivate mock:
userJoeMock.clear();
```

#### advanced usage:

A mock can also be based on the request information.

```js
// Wait 400ms before responding with the mock result:
const delay = 400;

const userDynamicMock = createMockEndpoint(
    getUserName,
    async (keys, url, headers) => {
        // Respond with different data depending on the url:
        if (url === '/user/1') {
            return {
                name: 'Alex',
            };
        }
        return {
            name: 'Joe',
        };
    },
    delay
);
```

### mockEndpointOnce

The `mockEndpointOnce` is similar to `mockEndpoint` however it will unbind after the first response.

```js
const userEndpoint = createGetEndpoint({ url: () => '/user' });
mockEndpointOnce(getUserName, async () => ({ name: 'Joe' }));
console.log(await userEndpoint()); // Will return the mocked value `{name: 'Joe'}`
userEndpoint.refresh();
console.log(await userEndpoint()); // Will return the value of an unmocked call`
```

### activateMocks

Activate multiple mocks at once

Usage:

```js
const userJoeMock = createMockEndpoint(getUserName, async () => ({
    name: 'Joe',
}));
const userAgeMock = createMockEndpoint(getUserAge, async () => ({ age: 99 }));
activateMocks(userJoeMock, userAgeMock);
```

### unmockAllEndpoints

Will clear all previously activated mocks

Usage:

```js
unmockAllEndpoints();
```

### groupMocks

Allows to group multiple mocks into one

Usage:

```js
const userAgeMock = createMockEndpoint(getAge, async () => ({ age: 99 }));
const userNameMock = createMockEndpoint(getName, async () => ({
    name: 'Alex',
}));
const mockGroup = groupMockEndpoints(userAgeMock, userNameMock);
mockGroup.activate();
```

It is even possible to group multiple groups into one.

## setRequestMockLogging

In some scenarios like jest test runs it can be helpful to disable the logging done
by this library.

```js
setRequestMockLogging(false);
```

## License

[MIT license](http://opensource.org/licenses/MIT)
