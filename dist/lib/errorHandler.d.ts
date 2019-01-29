export declare type AjaxError = Error & {
    error: ErrorResponseError;
};
export declare const AJAX_ERROR_EVENT_NAME = "ajaxEndpointFailed";
export declare type ErrorResponseError = {
    response: Response;
    responseContent: object;
    errorHandlingAttemps: Array<string>;
    resolve: (reason: string) => any;
    reject: () => any;
};
export declare function errorHandler(response: Response, errorHandlingAttemps: Array<string>): Promise<string>;
