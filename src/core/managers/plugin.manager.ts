import { err, fromPromise, ok, type Result } from 'neverthrow'
import { container, injectable } from 'tsyringe'
import type winston from 'winston'
import {
	PluginError,
	PluginNotFoundError,
	RegistrationError,
} from '#core/errors'
import { createLogger } from '#core/logger'
import type { BasePlugin } from '#core/plugin'

export type PluginHook =
	| 'onReady'
	| 'onServiceConnected'
	| 'onClientReady'
	| 'onError'
	| 'onCommandExecuted'
	| 'onBeforeDestroy'
	| 'onDestroy'

export interface PluginHealth {
	loaded: boolean
	healthy: boolean
	metadata?: Record<string, unknown>
}

@injectable()
export class PluginManager {
	private readonly logger: winston.Logger
	private readonly plugins = new Map<string, BasePlugin>()
	private readonly pluginNames: string[] = []

	constructor() {
		this.logger = createLogger('plugin', 'manager')
	}

	public register(plugin: BasePlugin): Result<void, RegistrationError> {
		if (this.plugins.has(plugin.name)) {
			return err(
				new RegistrationError(
					`Plugin with name "${plugin.name}" is already registered.`,
				),
			)
		}

		this.logger.debug(`Registering plugin: ${plugin.name}`)
		this.plugins.set(plugin.name, plugin)
		this.pluginNames.push(plugin.name)
		container.registerInstance(plugin.constructor as any, plugin)
		return ok(undefined)
	}

	public async triggerHook(
		hookName: PluginHook,
		...args: unknown[]
	): Promise<Result<void, PluginError>> {
		this.logger.debug(`Triggering hook: ${hookName}`)

		const isReversed =
			hookName === 'onBeforeDestroy' || hookName === 'onDestroy'
		const pluginNames = isReversed
			? [...this.pluginNames].reverse()
			: this.pluginNames

		for (const name of pluginNames) {
			const plugin = this.plugins.get(name)!
			const hook = plugin[hookName] as (...a: unknown[]) => Promise<any>

			if (typeof hook === 'function') {
				const hookResult = await fromPromise(
					hook.apply(plugin, args),
					(e) =>
						new PluginError(
							`Hook "${hookName}" in plugin "${name}" threw an unhandled exception.`,
							{
								cause: e as Error,
							},
						),
				)

				if (hookResult.isErr()) {
					this.logger.error(hookResult.error.message, {
						error: hookResult.error,
					})
					if (hookName !== 'onError' && hookName !== 'onDestroy') {
						return err(hookResult.error)
					}
				}

				if (hookResult.isOk()) {
					const result = hookResult.value
					if (result && result.isErr()) {
						const error = new PluginError(
							`Hook "${hookName}" in plugin "${name}" failed.`,
							{
								cause: result.error,
							},
						)
						this.logger.error(error.message, { error })
						if (hookName !== 'onError' && hookName !== 'onDestroy') {
							return err(error)
						}
					}
				}
			}
		}

		return ok(undefined)
	}

	public async getHealth(): Promise<Record<string, PluginHealth>> {
		const health: Record<string, PluginHealth> = {}
		for (const name of this.pluginNames) {
			health[name] = {
				loaded: true,
				healthy: true,
			}
		}
		return health
	}

	public get(name: string): Result<BasePlugin, PluginNotFoundError> {
		const plugin = this.plugins.get(name)
		if (!plugin) {
			return err(new PluginNotFoundError(`Plugin "${name}" not found.`))
		}
		return ok(plugin)
	}
}
