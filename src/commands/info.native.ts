import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import { createEmbed } from '#utils/embed'

export const info = createCommand({
	data: {
		name: 'info',
		description: 'Display information about the bot',
	},
	run: async ({ interaction, client }) => {
		const embed = createEmbed({
			level: 'info',
			title: 'Bot infos',
			fields: [
				{
					name: 'Name',
					value: client.user.username,
				},
			],
		})

		await interaction.reply({ embeds: [embed] })

		return ok(undefined)
	},
	middlewares: [],
})
