import { MessageFlags, SlashCommandBuilder } from 'discord.js'
import { ok, type Result } from 'neverthrow'
import { BaseCommand } from '#core/command'
import type { CommandError } from '#core/errors'
import type { CommandContext } from '#core/middleware'

export class PingCommand extends BaseCommand {
	public readonly name = 'ping'
	public readonly description = 'Replies with Pong!'

	public buildCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description)
	}

	public async execute(
		ctx: CommandContext,
	): Promise<Result<void, CommandError>> {
		await ctx.interaction.reply({
			content: 'Pong!',
			flags: MessageFlags.Ephemeral,
		})
		return ok(undefined)
	}
}
