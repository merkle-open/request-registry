# Request Registry Errors

Helper to catch unhandled errors for logging or showing global notifications.

⚠️ Does not support IE11

## Getting started

```
npm install --save-dev registry-request-errors
```

## Api

### onUnhandledRequestRegistyError

The `onUnhandledRequestRegistyError` is the main feature of this package.  
It will be executed whenever a request-registry error was not handled

```js
onUnhandledRequestRegistyError(({ response, responseContent }) => {
    console.error('Request failed', response, responseContent);
});
```

## License

[MIT license](http://opensource.org/licenses/MIT)
