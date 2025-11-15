import { Client, type ClientOptions, Events } from 'discord.js'
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
import type { BaseCommand } from '#core/command'

// managers
import { ServiceManager } from '#managers/service.manager'
import { PluginManager, type PluginHealth } from '#managers/plugin.manager'
import { CommandManager } from '#managers/command.manager'

export interface HealthCheck {
	status: 'healthy' | 'degraded' | 'unhealthy'
	uptime: number
	version: string
	services: Record<string, ServiceStatus>
	plugins: Record<string, PluginHealth>
}

export interface BotClientOptions extends ClientOptions {
	config?: Record<string, unknown>
	services: Array<InjectionToken<BaseService>>
	plugins: Array<InjectionToken<BasePlugin>>
	commands: Array<InjectionToken<BaseCommand>>
}

@singleton()
export class BotClient extends Client<true> {
	public readonly config: Record<string, unknown>
	public readonly serviceManager: ServiceManager
	public readonly pluginManager: PluginManager
	public readonly commandManager: CommandManager
	private readonly logger: winston.Logger

	constructor(options: BotClientOptions) {
		super(options)
		this.config = options.config ?? {}
		this.logger = createLogger('client')

		this.serviceManager = container.resolve(ServiceManager)
		this.pluginManager = container.resolve(PluginManager)
		this.commandManager = container.resolve(CommandManager)

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

	private registerServices(services: Array<InjectionToken<BaseService>>): void {
		for (const service of services) {
			this.serviceManager.register(container.resolve(service))
		}
	}

	private registerPlugins(plugins: Array<InjectionToken<BasePlugin>>): void {
		for (const plugin of plugins) {
			this.pluginManager.register(container.resolve(plugin))
		}
	}

	private registerCommands(commands: Array<InjectionToken<BaseCommand>>): void {
		for (const command of commands) {
			this.commandManager.register(container.resolve(command))
		}
	}

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

		for (const service of this.serviceManager['services'].values()) {
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
