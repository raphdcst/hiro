import { MessageFlags, SlashCommandBuilder } from 'discord.js'
import { ok, type Result } from 'neverthrow'
import { inject, injectable } from 'tsyringe'
import { BaseCommand } from '#core/command'
import type { CommandError } from '#core/errors'
import type { CommandContext } from '#core/middleware'
import { IDatabaseService } from '../interfaces/database.interface'

@injectable()
export class DatabaseCommand extends BaseCommand {
	public readonly name = 'database'
	public readonly description = 'get db status'

	constructor(@inject(IDatabaseService) private db: IDatabaseService) {
		super()
	}

	public buildCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description)
		// Add command options here, e.g.:
		// .addStringOption(option =>
		//     option.setName('input')
		//         .setDescription('Your input')
		//         .setRequired(true));
	}

	public async execute(
		ctx: CommandContext,
	): Promise<Result<void, CommandError>> {
		this.logger.debug(`Executing command: ${this.name}`)

		const result = await this.db.db.execute('SELECT 1')

		await ctx.interaction.reply({
			content: JSON.stringify(result),
			flags: MessageFlags.Ephemeral,
		})

		return ok(undefined)
	}
}
