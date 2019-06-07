import { errorHandler } from "./errorHandler";

/**
 * The recurisve loader allows to retry requests
 */
export function recursiveLoader(
	loadFn: typeof fetch,
	url: string,
	method: "POST" | "PUT" | "GET" | "DELETE",
	headers: { [key: string]: string },
	body?: any
): Promise<Response> {
	const errorHandlingAttemps: Array<string> = [];
	/**
	 * Recursive helper function to retry the load
	 * until either the response is okay or the errhandler can't handle the error
	 */
	function loadWithErrorHandling(): Promise<Response> {
		// TODO: Consider strinifying the body, but then you can't send Form Data.
		return loadFn(url, { method, headers, body }).then(
			(response: Response) => {
				return response.ok
					? response
					: errorHandler(response, errorHandlingAttemps).then(
							resolverName => {
								// Store the resolver name
								errorHandlingAttemps.push(resolverName);
								// Retry loading
								return loadWithErrorHandling();
							}
					  );
			}
		);
	}
	return loadWithErrorHandling();
}
