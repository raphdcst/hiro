import type { BaseError } from '#core/errors'
import { ok, type Result, type Ok } from 'neverthrow'

/**
 * Executes a function that returns a Result. If the result is an error,
 * it calls the error handler to get a fallback value.
 * This function always returns an Ok value, allowing the caller to avoid
 * conditional checks for errors.
 *
 * @param fn The function to execute.
 * @param errFn A function to call if `fn` returns an error. It must return a fallback value of type T.
 * @returns An Ok containing either the success value from `fn` or the fallback value from `errFn`.
 */
export function withErrorHandler<T>(
	fn: () => Result<T, BaseError>,
	errFn: (err: BaseError) => T,
): Ok<T, never> {
	const result = fn()

	if (result.isErr()) {
		const fallback = errFn(result.error)
		return ok(fallback)
	}

	return ok(result.value)
}
