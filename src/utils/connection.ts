import {
	type BaseError,
	ConnectionError,
	DisconnectionError,
} from '#core/errors'
import { err, ok, type Result, fromPromise, fromThrowable } from 'neverthrow'
import type winston from 'winston'

/**
 * Handles a function that can be either a promise or a regular function.
 * @param fn The function to handle.
 * @param errFn The function to call if an error occurs.
 * @returns A `Result` with the result of the function or a `BaseError`.
 * @internal
 */
export async function handleFunctionType<T>(
	fn: PromiseLike<T> | (() => void),
	errFn: (err: unknown) => BaseError,
): Promise<Result<T, BaseError>> {
	if (typeof (fn as PromiseLike<T>).then === 'function') {
		return fromPromise(fn as Promise<T>, errFn)
	}

	const result = fromThrowable(fn as () => T, errFn)()
	return Promise.resolve(result)
}

/**
 * Handles a connection process.
 * @param resolve The function to resolve.
 * @param successMsg The message to log on success.
 * @param errMsg The message to use for the error on failure.
 * @param logger The logger instance.
 * @returns A `Result` indicating success or a `ConnectionError`.
 */
export async function handleConnection<T>(
	resolve: PromiseLike<T> | (() => void),
	successMsg: string,
	errMsg: string,
	logger: winston.Logger,
): Promise<Result<void, ConnectionError>> {
	const result = await handleFunctionType(
		resolve,
		(error) => new ConnectionError(errMsg, { cause: error as Error }),
	)

	if (result.isErr()) {
		return err(result.error)
	}

	logger.info(successMsg)
	return ok(undefined)
}

/**
 * Handles a disconnection process.
 * @param resolve The function to resolve.
 * @param successMsg The message to log on success.
 * @param errMsg The message to use for the error on failure.
 * @param logger The logger instance.
 * @param onSuccess A function to call on success.
 * @returns A `Result` indicating success or a `DisconnectionError`.
 */
export async function handleDisconnection<T>(
	resolve: PromiseLike<T> | (() => void),
	successMsg: string,
	errMsg: string,
	logger: winston.Logger,
	onSuccess?: () => void,
): Promise<Result<void, DisconnectionError>> {
	const result = await handleFunctionType(
		resolve,
		(error) => new DisconnectionError(errMsg, { cause: error as Error }),
	)

	if (result.isErr()) {
		return err(result.error)
	}

	onSuccess?.()
	logger.info(successMsg)
	return ok(undefined)
}
