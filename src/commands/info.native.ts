import { ok } from 'neverthrow'
import { createCommand } from '#core/command'

export const info = createCommand({
	data: {
		name: 'info',
		description: 'Display information about the bot',
	},
	run: async ({ interaction, client }) => {
		const embed = client.createEmbed({
			level: 'info',
			title: 'Infos',
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
