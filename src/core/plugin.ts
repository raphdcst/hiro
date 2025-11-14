import type { Result } from 'neverthrow'
import type winston from 'winston'
import type { BaseError, PluginError } from '#core/errors'
import { createLogger } from '#core/logger'
import type { BaseService } from '#core/service'

export abstract class BasePlugin {
	public abstract readonly name: string
	private _logger: winston.Logger | undefined

	protected get logger(): winston.Logger {
		if (!this._logger) {
			this._logger = createLogger(this.name, 'plugin')
		}
		return this._logger
	}

	public onReady?(): Promise<Result<void, PluginError>>
	public onClientReady?(): Promise<Result<void, PluginError>>
	public onServiceConnected?(
		service: BaseService,
	): Promise<Result<void, PluginError>>
	public onError?(error: BaseError): Promise<Result<void, PluginError>>
	public onCommandExecuted?(
		commandName: string,
		result: Result<unknown, BaseError>,
	): Promise<void>
	public onBeforeDestroy?(): Promise<Result<void, PluginError>>
	public onDestroy?(): Promise<Result<void, PluginError>>
}
