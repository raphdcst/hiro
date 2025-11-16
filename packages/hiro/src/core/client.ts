import { Client, type ClientOptions, type APIEmbed, Events } from 'discord.js'
import { err, fromPromise, ok, type Result } from 'neverthrow'
import { container, singleton, type InjectionToken } from 'tsyringe'
import type winston from 'winston'

// global
import { env } from '#core/env'
import { type ShutdownError, StartupError } from '#core/errors'
import { createLogger } from '#core/logger'

// base
import type { BaseService, ServiceStatus } from '#core/service'
import type { BasePlugin } from '#core/plugin'
import type { Command } from '#core/command'

// managers
import { ServiceManager } from '#managers/service.manager'
import { PluginManager, type PluginHealth } from '#managers/plugin.manager'
import { CommandManager } from '#managers/command.manager'
import { createEmbedFactory, type EmbedData } from '#utils/embed'

/**
 * Represents the health status of the bot.
 */
export interface HealthCheck {
	/** The overall status of the bot. */
	status: 'healthy' | 'degraded' | 'unhealthy'
	/** The uptime of the bot in seconds. */
	uptime: number
	/** The version of the bot. */
	version: string
	/** The health status of each registered service. */
	services: Record<string, ServiceStatus>
	/** The health status of each registered plugin. */
	plugins: Record<string, PluginHealth>
}

export interface BotClientConfig {
	embed?: Partial<APIEmbed>
}

/**
 * Options for the BotClient.
 */
export interface BotClientOptions extends ClientOptions {
	/** Configuration flags for the bot. */
	config?: BotClientConfig
	/** An array of service classes to register. */
	services: Array<InjectionToken<BaseService>>
	/** An array of plugin classes to register. */
	plugins: Array<InjectionToken<BasePlugin>>
	/** An array of command objects to register. */
	commands: Command[]
}

/**
 * The main orchestrator for the Discord bot.
 * @extends Client
 */
@singleton()
export class BotClient extends Client<true> {
	/** Configuration flags for the bot. */
	public readonly config: BotClientConfig
	/** Manages the lifecycle of services. */
	public readonly serviceManager: ServiceManager
	/** Manages plugins and orchestrates hooks. */
	public readonly pluginManager: PluginManager
	/** Manages and executes commands. */
	public readonly commandManager: CommandManager
	private readonly logger: winston.Logger
	public readonly createEmbed: (
		data: EmbedData,
		useDefaults?: boolean,
	) => import('discord.js').EmbedBuilder

	/**
	 * @param options The options for the bot client.
	 */
	constructor(options: BotClientOptions) {
		super(options)
		this.config = options.config ?? {}
		this.logger = createLogger('client')

		this.serviceManager = container.resolve(ServiceManager)
		this.pluginManager = container.resolve(PluginManager)
		this.commandManager = container.resolve(CommandManager)

		this.createEmbed = createEmbedFactory(this.config.embed ?? {})

		for (const toRegister of [
			options.services,
			options.plugins,
			options.commands,
		]) {
			if (toRegister.length === 0) {
				this.logger.warn(
					`No ${toRegister === options.services ? 'services' : toRegister === options.plugins ? 'plugins' : 'commands'} to register`,
				)
			}
		}

		this.registerServices(options.services)
		this.registerPlugins(options.plugins)
		this.registerCommands(options.commands)

		this.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isChatInputCommand()) return
			await this.commandManager.handleInteraction(interaction, this)
		})
	}

	/**
	 * Registers the services with the service manager.
	 * @param services The services to register.
	 * @private
	 */
	private registerServices(services: Array<InjectionToken<BaseService>>): void {
		for (const service of services) {
			this.serviceManager.register(container.resolve(service))
		}
	}

	/**
	 * Registers the plugins with the plugin manager.
	 * @param plugins The plugins to register.
	 * @private
	 */
	private registerPlugins(plugins: Array<InjectionToken<BasePlugin>>): void {
		for (const plugin of plugins) {
			this.pluginManager.register(container.resolve(plugin))
		}
	}

	/**
	 * Registers the commands with the command manager.
	 * @param commands The commands to register.
	 * @private
	 */
	private registerCommands(commands: Command[]): void {
		for (const command of commands) {
			this.commandManager.register(command)
		}
	}

	/**
	 * Starts the bot, connects services, and logs in to Discord.
	 * @returns A `Result` indicating success or a `StartupError`.
	 */
	public async start(): Promise<Result<void, StartupError>> {
		this.logger.debug('Starting bot...')

		const connectResult = await this.serviceManager.connectAll()
		if (connectResult.isErr()) {
			return err(
				new StartupError('Failed to connect services', {
					cause: connectResult.error,
				}),
			)
		}

		for (const service of this.serviceManager.services.values()) {
			await this.pluginManager.triggerHook('onServiceConnected', service)
		}

		this.logger.debug('Logging in to Discord...')
		const loginResult = await fromPromise(
			this.login(env.DISCORD_TOKEN),
			(error) =>
				new StartupError('Failed to login to Discord', {
					cause: error as Error,
				}),
		)
		if (loginResult.isErr()) {
			return err(loginResult.error)
		}
		this.logger.info('Logged in successfully.')

		const onReadyResult = await this.pluginManager.triggerHook('onReady')
		if (onReadyResult.isErr()) {
			return err(
				new StartupError('onReady hooks failed', {
					cause: onReadyResult.error,
				}),
			)
		}

		await new Promise<void>((resolve) =>
			this.once(Events.ClientReady, () => resolve()),
		)

		const onClientReadyResult =
			await this.pluginManager.triggerHook('onClientReady')
		if (onClientReadyResult.isErr()) {
			return err(
				new StartupError('onClientReady hooks failed', {
					cause: onClientReadyResult.error,
				}),
			)
		}

		const registerCommandsResult =
			await this.commandManager.registerCommandsWithDiscord()
		if (registerCommandsResult.isErr()) {
			return err(
				new StartupError('Failed to register slash commands', {
					cause: registerCommandsResult.error,
				}),
			)
		}

		this.logger.info('Bot started successfully.')
		return ok(undefined)
	}

	/**
	 * Stops the bot, disconnects services, and logs out from Discord.
	 * @returns A `Result` indicating success or a `ShutdownError`.
	 */
	public async stop(): Promise<Result<void, ShutdownError>> {
		this.logger.debug('Stopping bot...')

		await this.pluginManager.triggerHook('onBeforeDestroy')
		await this.pluginManager.triggerHook('onDestroy')
		await this.serviceManager.disconnectAll()

		this.destroy()
		this.logger.info('Logged out from Discord.')

		this.logger.info('Bot stopped successfully.')
		return ok(undefined)
	}

	/**
	 * Retrieves the health status of the bot and its components.
	 * @returns A `HealthCheck` object.
	 */
	public async getHealth(): Promise<HealthCheck> {
		const serviceHealth = await this.serviceManager.getHealth()
		const pluginHealth = await this.pluginManager.getHealth()

		const allServicesHealthy = Object.values(serviceHealth).every(
			(s: ServiceStatus) => s.healthy,
		)
		const allPluginsHealthy = Object.values(pluginHealth).every(
			(p: PluginHealth) => p.healthy,
		)

		let status: HealthCheck['status']
		if (allServicesHealthy && allPluginsHealthy) {
			status = 'healthy'
		} else if (allServicesHealthy || allPluginsHealthy) {
			status = 'degraded'
		} else {
			status = 'unhealthy'
		}

		return {
			status,
			uptime: process.uptime(),
			version: process.env.npm_package_version ?? 'unknown',
			services: serviceHealth,
			plugins: pluginHealth,
		}
	}
}
