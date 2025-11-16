import { createCommand } from '#core/command'
import { CommandManager } from '#core/managers/command.manager'
import { createEmbed } from '#utils/embed'
import { ok } from 'neverthrow'

export const help = createCommand({
	data: {
		name: 'help',
		description: 'Show available commands and their descriptions.',
	},
	run: async ({ interaction, container }) => {
		const commandManager = container.resolve<CommandManager>(CommandManager)
		const commands = commandManager.commandsMetadata

		const embed = createEmbed({
			level: 'info',
			title: 'Help',
			description: 'Here are the available commands:',
			fields: commands.map((command) => ({
				name: `/${command.name}`,
				value: command.description,
			})),
		})

		await interaction.reply({
			embeds: [embed],
		})

		return ok(undefined)
	},
	middlewares: [],
})
