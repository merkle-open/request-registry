module.exports = {
	transform: {
		".(ts|tsx)":
			"/Users/jnicklas/Desktop/request-registry/core/node_modules/tsdx/node_modules/ts-jest/dist/index.js"
	},
	transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	collectCoverageFrom: ["src/**/*.{ts,tsx}"],
	testMatch: ["<rootDir>/test/**/*.(spec|test).{ts,tsx}"],
	testURL: "http://localhost",
	rootDir: "/Users/jnicklas/Desktop/request-registry/core",
	watchPlugins: [
		"/Users/jnicklas/Desktop/request-registry/core/node_modules/tsdx/node_modules/jest-watch-typeahead/filename.js",
		"/Users/jnicklas/Desktop/request-registry/core/node_modules/tsdx/node_modules/jest-watch-typeahead/testname.js"
	]
};
