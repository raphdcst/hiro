import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import { ApplicationCommandOptionType, MessageFlags } from 'discord.js'
import { ModerationPlugin } from '#plugins/moderation.plugin'

export const history = createCommand({
	data: {
		name: 'history',
		description: "View a user's moderation history.",
		options: [
			{
				name: 'user',
				description: 'The user to view the history of.',
				type: ApplicationCommandOptionType.User,
				required: true,
			},
		],
	},
	run: async ({ interaction, container, client }) => {
		if (!interaction.guildId) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Failed to get user history',
				description: 'This command can only be used in a server.',
			})
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			})
			return ok(undefined)
		}

		const user = interaction.options.getUser('user', true)

		const moderationPlugin = container.resolve(ModerationPlugin)

		const casesResult = await moderationPlugin.getUserCases(
			user.id,
			interaction.guildId,
		)

		if (casesResult.isErr()) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Failed to get user history',
				description: casesResult.error.message,
			})
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			})
			return ok(undefined)
		}

		const cases = casesResult.value

		if (cases.length === 0) {
			const embed = client.createEmbed({
				level: 'info',
				title: `No history found for ${user.tag}`,
			})
			await interaction.reply({ embeds: [embed] })
			return ok(undefined)
		}

		const embed = client.createEmbed({
			level: 'info',
			title: `Moderation history for ${user.tag} (25 latest)`,
			fields: cases.slice(-25).map((c) => ({
				name: `Case ${c.caseId}`,
				value: `**Type:** ${c.type}
**Reason:** ${c.reason}
**Moderator:** <@${c.moderatorId}>
**Date:** ${new Date(c.createdAt).toUTCString()}`,
			})),
		})

		await interaction.reply({ embeds: [embed] })

		return ok(undefined)
	},
})
