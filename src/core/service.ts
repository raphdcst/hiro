import type { Result } from 'neverthrow'
import type winston from 'winston'
import type {
	ConnectionError,
	DisconnectionError,
	StatusError,
} from '#core/errors'
import { createLogger } from '#core/logger'

/**
 * Represents the status of a service.
 */
export interface ServiceStatus {
	/** Whether the service is connected. */
	connected: boolean
	/** Whether the service is healthy. */
	healthy: boolean
	/** Additional metadata about the service's status. */
	metadata?: Record<string, unknown>
}

/**
 * The base class for all services.
 */
export abstract class BaseService {
	/** The name of the service. */
	public abstract readonly name: string
	/** The injection token for the service. */
	public abstract readonly token: symbol
	private _logger: winston.Logger | undefined

	/** The logger for the service. */
	protected get logger(): winston.Logger {
		if (!this._logger) {
			this._logger = createLogger(this.name, 'service')
		}
		return this._logger
	}

	/**
	 * Connects the service.
	 * @returns A `Result` indicating success or a `ConnectionError`.
	 */
	public abstract connect(): Promise<Result<void, ConnectionError>>
	/**
	 * Disconnects the service.
	 * @returns A `Result` indicating success or a `DisconnectionError`.
	 */
	public abstract disconnect(): Promise<Result<void, DisconnectionError>>
	/**
	 * Retrieves the status of the service.
	 * @returns A `Result` with the service status or a `StatusError`.
	 */
	public abstract getStatus(): Promise<Result<ServiceStatus, StatusError>>
}
