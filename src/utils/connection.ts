import {
	type BaseError,
	ConnectionError,
	DisconnectionError,
} from '#core/errors'
import { err, ok, type Result, fromPromise, fromThrowable } from 'neverthrow'
import type winston from 'winston'

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
