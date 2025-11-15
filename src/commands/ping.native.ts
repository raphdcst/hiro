import { SlashCommandBuilder } from 'discord.js'
import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import { loggerMiddleware } from '#middlewares/logger'

export const ping = createCommand({
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	run: async ({ interaction }) => {
		await interaction.reply({
			content: 'Pong!',
		})
		return ok(undefined)
	},
	middlewares: [loggerMiddleware()],
})
