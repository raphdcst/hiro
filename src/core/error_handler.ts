import type winston from 'winston'
import { createLogger } from '#core/logger'
import type { BaseError } from './errors'

export interface ErrorContext {
	component: 'service' | 'plugin' | 'command' | 'middleware' | 'client'
	name?: string
	metadata?: Record<string, unknown>
}

export class GlobalErrorHandler {
	private readonly logger: winston.Logger

	constructor() {
		this.logger = createLogger('error-handler')
	}

	public handle(error: BaseError, context: ErrorContext): void {
		this.logger.error('Unhandled error', {
			error: error.toJSON(),
			context,
			stack: error.stack,
		})
	}

	public handleFatal(error: Error): never {
		this.logger.error('Fatal error - shutting down', {
			error: error.message,
			stack: error.stack,
		})

		process.exit(1)
	}
}
