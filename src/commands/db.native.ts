import { SlashCommandBuilder } from 'discord.js'
import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import {
	IDatabaseService,
	type IDatabaseService as IDatabaseServiceType,
} from '#interfaces/database'

export const db = createCommand({
	data: new SlashCommandBuilder()
		.setName('db')
		.setDescription('Test the database connection.'),
	run: async ({ interaction, container }) => {
		const db = container.resolve<IDatabaseServiceType>(IDatabaseService)
		const result = await db.getStatus()

		if (result.isErr()) {
			await interaction.reply({
				content: 'Failed to get database status.',
			})
			return ok(undefined)
		}

		await interaction.reply({
			content: `Database status: ${JSON.stringify(result.value)}`,
		})

		return ok(undefined)
	},
})
