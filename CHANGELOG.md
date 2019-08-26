# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
