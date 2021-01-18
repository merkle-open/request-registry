# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.12.2](https://github.com/namics/request-registry/compare/v0.12.1...v0.12.2) (2021-01-18)


### Bug Fixes

* **request-registry-mock:** Clear cache during unmocking ([#26](https://github.com/namics/request-registry/issues/26)) ([9a32a42](https://github.com/namics/request-registry/commit/9a32a4269145c25923d6d0863e5938b053086a4c))





## [0.12.1](https://github.com/namics/request-registry/compare/v0.12.0...v0.12.1) (2020-11-10)


### Bug Fixes

* add overwriting docs ([82bd90c](https://github.com/namics/request-registry/commit/82bd90c01a1c48bd22583284bf2cdf2a7a16b8fd))





# [0.12.0](https://github.com/namics/request-registry/compare/v0.11.2...v0.12.0) (2020-06-15)


### Features

* **request-registry-react:** Filter headers when value is either undefined or void ([a0e44d9](https://github.com/namics/request-registry/commit/a0e44d9ea7fb56273fb1765a984eb45924ec691f))





## [0.11.2](https://github.com/namics/request-registry/compare/v0.11.1...v0.11.2) (2020-03-20)


### Bug Fixes

* grant access to the error response ([e5aaba9](https://github.com/namics/request-registry/commit/e5aaba9a331d271fa0a886c65f3d7ec2ad904665))





## [0.11.1](https://github.com/namics/request-registry/compare/v0.11.0...v0.11.1) (2020-02-19)


### Bug Fixes

* adjust module path ([a73b950](https://github.com/namics/request-registry/commit/a73b9507d38c0bd868a4630cc6b34bf6842160a7))
* Upgrade dependencies ([daa451e](https://github.com/namics/request-registry/commit/daa451e01fbcba9f0b24e23e4c923c2a4fe3d76a))
* Upgrade dependencies ([712d111](https://github.com/namics/request-registry/commit/712d111616abadabb593f6ee38bd110835074b7a))
* Upgrade dependencies ([be0f36c](https://github.com/namics/request-registry/commit/be0f36cbe6912c92ddd7ba61b93bf037a601c0ae))





# [0.11.0](https://github.com/namics/request-registry/compare/v0.10.3...v0.11.0) (2019-12-18)


### Features

* **request-registry-mock:** Allow to disable mock logging ([9cf5b32](https://github.com/namics/request-registry/commit/9cf5b32))





## [0.10.3](https://github.com/namics/request-registry/compare/v0.10.2...v0.10.3) (2019-11-05)


### Bug Fixes

* **request-registry-errors:** Ensure that errors from the same response trigger the error handler on ([bd15670](https://github.com/namics/request-registry/commit/bd15670))





## [0.10.2](https://github.com/namics/request-registry/compare/v0.10.1...v0.10.2) (2019-10-31)


### Bug Fixes

* **request-registry-errors:** Prevent null pointer exceptions in error tracing ([3b9544e](https://github.com/namics/request-registry/commit/3b9544e))





## [0.10.1](https://github.com/namics/request-registry/compare/v0.10.0...v0.10.1) (2019-10-31)


### Bug Fixes

* **core:** Improve typings for errors ([c1a291c](https://github.com/namics/request-registry/commit/c1a291c))
* **request-registry-errors:** Improve typings ([b9ab45a](https://github.com/namics/request-registry/commit/b9ab45a))





# [0.10.0](https://github.com/namics/request-registry/compare/v0.9.2...v0.10.0) (2019-10-31)


### Features

* **core:** Provide additional request information for failed requests ([88b0b0d](https://github.com/namics/request-registry/commit/88b0b0d))
* **request-registry-errors:** Provide utils to listen for unhandled request errors ([0402b48](https://github.com/namics/request-registry/commit/0402b48))





## [0.9.2](https://github.com/namics/request-registry/compare/v0.9.1...v0.9.2) (2019-10-25)


### Bug Fixes

* **request-registry-mock:** Don't notifiy observers on unmocking to prevent unexpected requests ([99aa769](https://github.com/namics/request-registry/commit/99aa769))





## [0.9.1](https://github.com/namics/request-registry/compare/v0.9.0...v0.9.1) (2019-10-25)


### Bug Fixes

* **request-registry-react:** Ensure that no request is executed initially if an endpoint is disabled ([94a0703](https://github.com/namics/request-registry/commit/94a0703))





# [0.9.0](https://github.com/namics/request-registry/compare/v0.8.1...v0.9.0) (2019-10-24)


### Bug Fixes

* **request-registry-mobx:** Increase unit test timeout for travis ([d5aadf0](https://github.com/namics/request-registry/commit/d5aadf0))
* **request-registry-mock:** Clear cache on mock activation ([2fc927e](https://github.com/namics/request-registry/commit/2fc927e))
* **request-registry-mock:** Clear caches after reverting a mock ([a40096b](https://github.com/namics/request-registry/commit/a40096b))


### Features

* **core:** Allow public access to cache ([4eb12c1](https://github.com/namics/request-registry/commit/4eb12c1))
* **request-registry-react:** Allow temporary disabling an endpoint ([fcb9fa2](https://github.com/namics/request-registry/commit/fcb9fa2))





## [0.8.1](https://github.com/namics/request-registry/compare/v0.8.0...v0.8.1) (2019-08-26)


### Bug Fixes

* **request-registry-react:** regenerate typings ([5ca4f37](https://github.com/namics/request-registry/commit/5ca4f37))





# [0.8.0](https://github.com/namics/request-registry/compare/v0.7.1...v0.8.0) (2019-08-26)


### Bug Fixes

* refreshing a react component returns now a promise ([f490e3e](https://github.com/namics/request-registry/commit/f490e3e))


### Features

* **request-registry-react:** add useGetEndPointLazy hook ([307b749](https://github.com/namics/request-registry/commit/307b749))





## [0.7.1](https://github.com/namics/request-registry/compare/v0.7.0...v0.7.1) (2019-06-20)


### Bug Fixes

* **core:** Stringify body objects ([9cc0bdc](https://github.com/namics/request-registry/commit/9cc0bdc))





# [0.7.0](https://github.com/namics/request-registry/compare/v0.6.1...v0.7.0) (2019-06-17)


### Features

* Add observe function ([ce6c890](https://github.com/namics/request-registry/commit/ce6c890))
* Rename clearCache to refresh ([dfe4a1d](https://github.com/namics/request-registry/commit/dfe4a1d))


### BREAKING CHANGES

* clearCache is now called refresh
* Remove the helper methods from endpoint: on, off, keepInCache





## [0.6.1](https://github.com/namics/request-registry/compare/v0.6.0...v0.6.1) (2019-06-14)


### Bug Fixes

* **request-registry-rxjs:** fix module path ([65e6d9e](https://github.com/namics/request-registry/commit/65e6d9e))





# [0.6.0](https://github.com/namics/request-registry/compare/v0.5.0...v0.6.0) (2019-06-14)


### Bug Fixes

* **request-registry-rxjs:** Use new Observable over deprecated Observable.create ([eaf3cac](https://github.com/namics/request-registry/commit/eaf3cac))


### Features

* **request-registry-rxjs:** Add RXJS util ([70880e2](https://github.com/namics/request-registry/commit/70880e2))






# [0.5.0](https://github.com/namics/request-registry/compare/v0.4.0...v0.5.0) (2019-06-14)


### Features

* **core:** Add GraphQL support ([707fbef](https://github.com/namics/request-registry/commit/707fbef))





# [0.4.0](https://github.com/namics/request-registry/compare/v0.3.0...v0.4.0) (2019-06-09)


### Bug Fixes

* **request-registry-mobx:** Remove react peer dependency ([eeaa47e](https://github.com/namics/request-registry/commit/eeaa47e))


### Features

* **core:** Allow to provide a custom cacheKeyGenerator ([316cd6b](https://github.com/namics/request-registry/commit/316cd6b))





# [0.3.0](https://github.com/namics/request-registry/compare/v0.2.1...v0.3.0) (2019-06-04)


### Features

* **request-registry-mobx:** Allow to set an initial value ([080c69c](https://github.com/namics/request-registry/commit/080c69c))





## [0.2.1](https://github.com/namics/request-registry/compare/v0.2.0...v0.2.1) (2019-06-04)


### Bug Fixes

* **request-registry-mobx:** Observe state from hasData ([01de88e](https://github.com/namics/request-registry/commit/01de88e))
* **request-registry-react:** Use cacheKey also to invalidate the useEffect cache ([d923bfc](https://github.com/namics/request-registry/commit/d923bfc))





# [0.2.0](https://github.com/namics/request-registry/compare/0.1.0...0.2.0) (2019-06-02)


### Bug Fixes

* **request-registry-mobx:** Remove synchronous side effect ([1300579](https://github.com/namics/request-registry/commit/1300579))
