import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import { ApplicationCommandOptionType, MessageFlags } from 'discord.js'
import { ModerationPlugin } from '@hiro/plugins'
import { nanoid } from 'nanoid'
import { parseDuration } from '#utils/time'

export const mute = createCommand({
	data: {
		name: 'mute',
		description: 'Mute a user.',
		options: [
			{
				name: 'user',
				description: 'The user to mute.',
				type: ApplicationCommandOptionType.User,
				required: true,
			},
			{
				name: 'duration',
				description: 'The duration of the mute (e.g., 1h, 1d).',
				type: ApplicationCommandOptionType.String,
				required: true,
			},
			{
				name: 'reason',
				description: 'The reason for the mute.',
				type: ApplicationCommandOptionType.String,
				required: false,
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
		const durationStr = interaction.options.getString('duration', true)
		const reason =
			interaction.options.getString('reason') ?? 'No reason provided.'

		const durationMs = parseDuration(durationStr)
		if (!durationMs) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Invalid duration',
				description: 'Please provide a valid duration (e.g., 1h, 1d).',
			})
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			})
			return ok(undefined)
		}

		const member = await interaction.guild.members.fetch(user.id)
		if (!member) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'User not found',
				description: 'The specified user is not a member of this server.',
			})
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			})
			return ok(undefined)
		}

		if (!member.moderatable) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Permission denied',
				description: 'I do not have permission to mute this user.',
			})
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			})
			return ok(undefined)
		}

		await member.timeout(durationMs, reason)

		const caseId = nanoid()
		const expiresAt = new Date(Date.now() + durationMs)

		const caseResult = await moderationPlugin.createCase({
			caseId,
			guildId: interaction.guild.id,
			moderatorId: interaction.user.id,
			userId: user.id,
			type: 'mute',
			reason,
			duration: durationMs,
			expiresAt,
		})

		if (caseResult.isErr()) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Failed to create mute case',
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
			title: `Successfully muted ${user.tag}`,
			description: `Reason: ${reason}\nDuration: ${durationStr}`,
			footer: {
				text: `Case ID: ${caseId}`,
			},
		})

		const dmEmbed = client.createEmbed({
			level: 'info',
			title: `You have been muted in ${interaction.guild.name}`,
			description: `Reason: ${reason}\nDuration: ${durationStr}`,
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
