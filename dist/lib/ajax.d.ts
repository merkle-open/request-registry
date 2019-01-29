/**
 * The main load function
 */
export declare function load(url: string, init?: RequestInit): Promise<Response>;
/**
 * The recurisve loader allows to retry requests
 */
export declare function recursiveLoader(loadFn: typeof load, url: string, method: 'POST' | 'PUT' | 'GET' | 'DELETE', headers: {
    [key: string]: string;
}, body?: any): Promise<Response>;
