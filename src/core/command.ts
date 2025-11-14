import type {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'
import type { Result } from 'neverthrow'
import type winston from 'winston'
import type { BotClient } from '#core/client'
import { CommandError, type MiddlewareError } from '#core/errors'
import { createLogger } from '#core/logger'
import {
	type CommandContext,
	type Middleware,
	TypedMetadata,
} from '#core/middleware'

export abstract class BaseCommand {
	public abstract readonly name: string
	public abstract readonly description: string
	private _logger: winston.Logger | undefined
	private readonly middlewares: Middleware[] = []

	protected get logger(): winston.Logger {
		if (!this._logger) {
			this._logger = createLogger(this.name, 'command')
		}
		return this._logger
	}

	public use(middleware: Middleware): void {
		this.middlewares.push(middleware)
	}

	public abstract buildCommand(): SlashCommandBuilder

	public abstract execute(
		ctx: CommandContext,
	): Promise<Result<void, CommandError>>

	public async _execute(
		interaction: ChatInputCommandInteraction,
		client: BotClient,
	): Promise<Result<void, CommandError>> {
		const ctx: CommandContext = {
			interaction,
			client,
			metadata: new TypedMetadata(),
		}

		const run = async (index: number): Promise<Result<void, CommandError>> => {
			if (index >= this.middlewares.length) {
				return this.execute(ctx)
			}
			const middleware = this.middlewares[index]!
			const result = await middleware(ctx, () => run(index + 1))
			return result.mapErr(
				(err: MiddlewareError) =>
					new CommandError('Middleware execution failed', { cause: err }),
			)
		}

		return run(0)
	}
}
