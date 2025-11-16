import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import { ApplicationCommandOptionType, MessageFlags } from 'discord.js'
import { ModerationPlugin } from '@hiro/plugins'
import { nanoid } from 'nanoid'

export const warn = createCommand({
	data: {
		name: 'warn',
		description: 'Warn a user.',
		options: [
			{
				name: 'user',
				description: 'The user to warn.',
				type: ApplicationCommandOptionType.User,
				required: true,
			},
			{
				name: 'reason',
				description: 'The reason for the warning.',
				type: ApplicationCommandOptionType.String,
				required: true,
			},
		],
	},
	run: async ({ interaction, container, client }) => {
		if (!interaction.guild) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Failed to mute user',
				description: 'This command can only be used in a server.',
			})
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			})
			return ok(undefined)
		}
		const moderationPlugin = container.resolve(ModerationPlugin)

		const user = interaction.options.getUser('user', true)
		const reason = interaction.options.getString('reason', true)

		const caseId = nanoid()

		const caseResult = await moderationPlugin.createCase({
			caseId,
			guildId: interaction.guild.id,
			moderatorId: interaction.user.id,
			userId: user.id,
			type: 'warn',
			reason,
		})

		if (caseResult.isErr()) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Failed to create warning',
				description: caseResult.error.message,
			})
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			})
			return ok(undefined)
		}

		const embed = client.createEmbed({
			level: 'success',
			title: `Successfully warned ${user.tag}`,
			description: `Reason: ${reason}`,
			footer: {
				text: `Case ID: ${caseId}`,
			},
		})

		const dmEmbed = client.createEmbed({
			level: 'info',
			title: `You have been warned in ${interaction.guild.name}`,
			description: `Reason: ${reason}`,
		})

		await user.send({ embeds: [dmEmbed] }).catch(() => {
			embed.addFields({
				name: 'Failed to DM user',
				value: 'The user may have DMs disabled.',
			})
		})

		await interaction.reply({ embeds: [embed] })

		return ok(undefined)
	},
})
