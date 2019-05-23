type EventCallback<TInput = unknown, TResult = void> = (
	data: TInput
) => TResult;
type EventCallbackArgument<T> = T extends EventCallback<infer U> ? U : T;
type EventCallbackReturnValue<T> = T extends EventCallback<infer _, infer U>
	? U
	: T;

/**
 * A very tiny event emitter based on https://github.com/scottcorgan/tiny-emitter
 */
export class Emitter<TData extends {} = { [key: string]: EventCallback }> {
	/**
	 * Event registry - named with `_` as this name cannot be minified and is only used
	 * internally
	 */
	_: { [name in keyof TData]?: Array<EventCallback> } = {};
	/**
	 * Allows to bind a callback to the event emitter
	 *
	 * Returns a disposable
	 */
	on<
		TName extends keyof TData,
		TArg extends EventCallbackArgument<TData[TName]>,
		TResult extends EventCallbackReturnValue<TData[TName]>
	>(name: TName, callback: (event: TArg) => TResult) {
		(this._[name] || (this._[name] = []))!.push(callback as any);
		return () => this.off(name, callback);
	}
	/**
	 * Returns all callback results
	 */
	emit<TName extends keyof TData>(
		name: TName,
		data: EventCallbackArgument<TData[TName]>
	) {
		return (this._[name] || [])!.map(
			(callback: Function) =>
				callback(data) as EventCallbackReturnValue<TData[TName]>
		);
	}
	/**
	 * Allow to unbind from the event
	 */
	off<
		TName extends keyof TData,
		TArg extends EventCallbackArgument<TData[TName]>,
		TResult extends EventCallbackReturnValue<TData[TName]>
	>(name: TName, callback?: (event: TArg) => TResult) {
		const eventRegistry = this._;
		const liveEvents = (eventRegistry[name] || [])!.filter(
			(listener: unknown) => listener !== callback
		);
		liveEvents.length
			? (eventRegistry[name] = liveEvents)
			: delete eventRegistry[name];
	}
}
