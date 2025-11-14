import type { Result } from 'neverthrow'
import type winston from 'winston'
import type {
	ConnectionError,
	DisconnectionError,
	StatusError,
} from '#core/errors'
import { createLogger } from '#core/logger'

export interface ServiceStatus {
	connected: boolean
	healthy: boolean
	metadata?: Record<string, unknown>
}

export abstract class BaseService {
	public abstract readonly name: string
	public abstract readonly token: symbol
	private _logger: winston.Logger | undefined

	protected get logger(): winston.Logger {
		if (!this._logger) {
			this._logger = createLogger(this.name, 'service')
		}
		return this._logger
	}

	public abstract connect(): Promise<Result<void, ConnectionError>>
	public abstract disconnect(): Promise<Result<void, DisconnectionError>>
	public abstract getStatus(): Promise<Result<ServiceStatus, StatusError>>
}
