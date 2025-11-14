export abstract class BaseError extends Error {
	public readonly timestamp: number
	public readonly context?: Record<string, unknown>

	constructor(
		message: string,
		options?: {
			cause?: Error
			context?: Record<string, unknown>
		},
	) {
		super(message, { cause: options?.cause })
		this.name = this.constructor.name
		this.timestamp = Date.now()
		this.context = options?.context
		Error.captureStackTrace(this, this.constructor)
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			timestamp: this.timestamp,
			context: this.context,
			cause:
				this.cause instanceof BaseError
					? this.cause.toJSON()
					: String(this.cause),
		}
	}
}

export class StartupError extends BaseError {}
export class ShutdownError extends BaseError {}
export class RegistrationError extends BaseError {}

export class ConnectionError extends BaseError {}
export class DisconnectionError extends BaseError {}
export class StatusError extends BaseError {}
export class ServiceNotFoundError extends BaseError {}

export class PluginError extends BaseError {}
export class PluginNotFoundError extends BaseError {}

export class CommandError extends BaseError {}
export class CommandNotFoundError extends BaseError {}

export class MiddlewareError extends BaseError {}

export class ValidationError extends BaseError {}
export class AuthorizationError extends BaseError {}
export class RateLimitError extends BaseError {}
