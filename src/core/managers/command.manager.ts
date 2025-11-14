import { REST } from '@discordjs/rest'
import type { ChatInputCommandInteraction } from 'discord.js'
import { Routes } from 'discord-api-types/v10'
import { err, fromPromise, ok, type Result } from 'neverthrow'
import { container, injectable } from 'tsyringe'
import type winston from 'winston'
import type { BotClient } from '#core/client'
import type { BaseCommand } from '#core/command'
import { env } from '#core/env'
import {
	CommandError,
	CommandNotFoundError,
	RegistrationError,
} from '#core/errors'
import { createLogger } from '#core/logger'

@injectable()
export class CommandManager {
	private readonly logger: winston.Logger
	private readonly commands = new Map<string, BaseCommand>()

	constructor() {
		this.logger = createLogger('command', 'manager')
	}

	public register(command: BaseCommand): Result<void, RegistrationError> {
		if (this.commands.has(command.name)) {
			return err(
				new RegistrationError(
					`Command with name "${command.name}" is already registered.`,
				),
			)
		}

		this.logger.debug(`Registering command: ${command.name}`)
		this.commands.set(command.name, command)
		container.registerInstance(command.constructor as any, command)
		return ok(undefined)
	}

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

		this.logger.debug(`Handling interaction for command: ${command.name}`)
		const result = await command._execute(interaction, client)

		if (result.isErr()) {
			this.logger.error(`Command execution failed for ${command.name}`, {
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

	public get(name: string): Result<BaseCommand, CommandNotFoundError> {
		const command = this.commands.get(name)
		if (!command) {
			return err(new CommandNotFoundError(`Command "${name}" not found.`))
		}
		return ok(command)
	}

	public async registerCommandsWithDiscord(): Promise<
		Result<void, CommandError>
	> {
		this.logger.debug('Registering slash commands with Discord...')
		const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN)
		const body = Array.from(this.commands.values()).map((c) =>
			c.buildCommand().toJSON(),
		)

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
