import type {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'
import type { Result } from 'neverthrow'
import type { container } from 'tsyringe'
import type { BotClient } from '#core/client'
import type { CommandError } from '#core/errors'
import type { Middleware, TypedMetadata } from '#core/middleware'

/**
 * The context for a command execution.
 */
export interface CommandContext {
	/** The interaction that triggered the command. */
	interaction: ChatInputCommandInteraction
	/** The bot client instance. */
	client: BotClient
	/** The dependency injection container. */
	container: typeof container
	/** A typed map for sharing data between middlewares. */
	metadata: TypedMetadata
}

/**
 * Represents a slash command.
 */
export interface Command {
	/** The slash command builder from discord.js. */
	data: SlashCommandBuilder
	/**
	 * The function to execute when the command is called.
	 * @param ctx The command context.
	 * @returns A `Result` indicating success or a `CommandError`.
	 */
	run: (ctx: CommandContext) => Promise<Result<void, CommandError>>
	/** An array of middlewares to apply to the command. */
	middlewares?: Middleware[]
}

/**
 * A factory function to create a command object.
 * @param command The command object.
 * @returns The command object.
 */
export const createCommand = (command: Command): Command => command
