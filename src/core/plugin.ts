import type { Result } from 'neverthrow'
import type winston from 'winston'
import type { BaseError, PluginError } from '#core/errors'
import { createLogger } from '#core/logger'
import type { BaseService } from '#core/service'

/**
 * The base class for all plugins.
 */
export abstract class BasePlugin {
	/** The name of the plugin. */
	public abstract readonly name: string
	private _logger: winston.Logger | undefined

	/** The logger for the plugin. */
	protected get logger(): winston.Logger {
		if (!this._logger) {
			this._logger = createLogger(this.name, 'plugin')
		}
		return this._logger
	}

	/**
	 * Called when the bot is ready and services are connected.
	 * @returns A `Result` indicating success or a `PluginError`.
	 */
	public onReady?(): Promise<Result<void, PluginError>>
	/**
	 * Called when the Discord client is ready.
	 * @returns A `Result` indicating success or a `PluginError`.
	 */
	public onClientReady?(): Promise<Result<void, PluginError>>
	/**
	 * Called when a service has successfully connected.
	 * @param service The service that connected.
	 * @returns A `Result` indicating success or a `PluginError`.
	 */
	public onServiceConnected?(
		service: BaseService,
	): Promise<Result<void, PluginError>>
	/**
	 * Called when an error occurs.
	 * @param error The error that occurred.
	 * @returns A `Result` indicating success or a `PluginError`.
	 */
	public onError?(error: BaseError): Promise<Result<void, PluginError>>
	/**
	 * Called after a command has been executed.
	 * @param commandName The name of the command that was executed.
	 * @param result The result of the command execution.
	 */
	public onCommandExecuted?(
		commandName: string,
		result: Result<unknown, BaseError>,
	): Promise<void>
	/**
	 * Called before the bot is destroyed.
	 * @returns A `Result` indicating success or a `PluginError`.
	 */
	public onBeforeDestroy?(): Promise<Result<void, PluginError>>
	/**
	 * Called when the bot is being destroyed.
	 * @returns A `Result` indicating success or a `PluginError`.
	 */
	public onDestroy?(): Promise<Result<void, PluginError>>
}
