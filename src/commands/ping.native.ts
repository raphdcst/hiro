import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import { loggerMiddleware } from '#middlewares/logger'
import { createEmbed } from '#utils/embed'

export const ping = createCommand({
	data: {
		name: 'ping',
		description: 'Replies with pong!',
	},
	run: async ({ interaction, client }) => {
		const embed = createEmbed({
			level: 'info',
			title: 'Pong!',
			description: `Latency: ${client.ws.ping}ms`,
		})

		await interaction.reply({
			embeds: [embed],
		})
		return ok(undefined)
	},
	middlewares: [loggerMiddleware()],
})
