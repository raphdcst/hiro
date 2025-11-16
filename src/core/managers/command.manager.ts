import { REST } from '@discordjs/rest'
import type { ChatInputCommandInteraction } from 'discord.js'
import { Routes } from 'discord-api-types/v10'
import { err, fromPromise, ok, type Result } from 'neverthrow'
import { container, singleton } from 'tsyringe'
import type winston from 'winston'
import type { BotClient } from '#core/client'
import type { Command, CommandContext } from '#core/command'
import { env } from '#core/env'
import {
	CommandError,
	CommandNotFoundError,
	type MiddlewareError,
	RegistrationError,
} from '#core/errors'
import { createLogger } from '#core/logger'
import { TypedMetadata } from '#core/middleware'

/**
 * Manages the registration, execution, and lifecycle of commands.
 */
@singleton()
export class CommandManager {
	private readonly logger: winston.Logger
	private readonly commands = new Map<string, Command>()

	constructor() {
		this.logger = createLogger('command', 'manager')
	}

	/**
	 * Registers a new command.
	 * @param command The command to register.
	 * @returns A `Result` indicating success or a `RegistrationError`.
	 */
	public register(command: Command): Result<void, RegistrationError> {
		if (this.commands.has(command.data.name)) {
			return err(
				new RegistrationError(
					`Command with name "${command.data.name}" is already registered.`,
				),
			)
		}

		this.logger.debug(`Registering command: ${command.data.name}`)
		this.commands.set(command.data.name, command)
		return ok(undefined)
	}

	/**
	 * Handles a chat input command interaction.
	 * @param interaction The interaction to handle.
	 * @param client The bot client instance.
	 * @returns A `Result` indicating success or a `CommandError`.
	 */
	public async handleInteraction(
		interaction: ChatInputCommandInteraction,
		client: BotClient,
	): Promise<Result<void, CommandError>> {
		const command = this.commands.get(interaction.commandName)
		if (!command) {
			this.logger.warn(
				`No command found for interaction: ${interaction.commandName}`,
			)
			await interaction.reply({ content: 'Unknown command.', ephemeral: true })
			return err(
				new CommandNotFoundError(
					`Command "${interaction.commandName}" not found.`,
				),
			)
		}

		this.logger.debug(`Handling interaction for command: ${command.data.name}`)

		const ctx: CommandContext = {
			interaction,
			client,
			container,
			metadata: new TypedMetadata(),
		}

		const middlewares = command.middlewares ?? []
		const run = async (index: number): Promise<Result<void, CommandError>> => {
			if (index >= middlewares.length) {
				return command.run(ctx)
			}
			const middleware = middlewares[index]!
			const result = await middleware(ctx, () => run(index + 1))
			return result.mapErr(
				(err: MiddlewareError) =>
					new CommandError('Middleware execution failed', { cause: err }),
			)
		}

		const result = await run(0)

		if (result.isErr()) {
			this.logger.error(`Command execution failed for ${command.data.name}`, {
				error: result.error,
			})
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: 'An error occurred while executing the command.',
					ephemeral: true,
				})
			}
		}

		return result
	}

	/**
	 * Retrieves a command by its name.
	 * @param name The name of the command to retrieve.
	 * @returns A `Result` with the command or a `CommandNotFoundError`.
	 */
	public get(name: string): Result<Command, CommandNotFoundError> {
		const command = this.commands.get(name)
		if (!command) {
			return err(new CommandNotFoundError(`Command "${name}" not found.`))
		}
		return ok(command)
	}

	/**
	 * Registers all commands with Discord.
	 * @returns A `Result` indicating success or a `CommandError`.
	 */
	public async registerCommandsWithDiscord(): Promise<
		Result<void, CommandError>
	> {
		this.logger.debug('Registering slash commands with Discord...')
		const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN)
		const body = Array.from(this.commands.values()).map((c) => c.data.toJSON())

		const result = await fromPromise(
			rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
				body,
			}),
			(error) => {
				this.logger.error('Failed to register slash commands with Discord.', {
					error,
				})
				return new CommandError(
					'Failed to register slash commands with Discord.',
					{
						cause: error as Error,
					},
				)
			},
		)

		if (result.isOk()) {
			this.logger.info('Successfully registered slash commands with Discord.')
		}

		return result.map(() => undefined)
	}
}
