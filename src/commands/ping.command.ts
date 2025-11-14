import { MessageFlags, SlashCommandBuilder } from 'discord.js'
import { ok, type Result } from 'neverthrow'
import { inject, injectable } from 'tsyringe'
import { BaseCommand } from '#core/command'
import type { CommandError } from '#core/errors'
import type { CommandContext } from '#core/middleware'
import {
	IDatabaseService,
	type IDatabaseService as IDatabaseServiceType,
} from '../interfaces/database.interface'

@injectable()
export class PingCommand extends BaseCommand {
	public readonly name = 'ping'
	public readonly description = 'Replies with Pong!'

	constructor(@inject(IDatabaseService) private db: IDatabaseServiceType) {
		super()
	}

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
