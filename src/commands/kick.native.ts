import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import { ApplicationCommandOptionType, MessageFlags } from 'discord.js'
import { ModerationPlugin } from '#plugins/moderation.plugin'
import { nanoid } from 'nanoid'

export const kick = createCommand({
	data: {
		name: 'kick',
		description: 'Kick a user.',
		options: [
			{
				name: 'user',
				description: 'The user to kick.',
				type: ApplicationCommandOptionType.User,
				required: true,
			},
			{
				name: 'reason',
				description: 'The reason for the kick.',
				type: ApplicationCommandOptionType.String,
				required: false,
			},
		],
	},
	run: async ({ interaction, container, client }) => {
		if (!interaction.guild) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Failed to kick user',
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
		const reason =
			interaction.options.getString('reason') ?? 'No reason provided.'

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

		if (!member.kickable) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Permission denied',
				description: 'I do not have permission to kick this user.',
			})
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			})
			return ok(undefined)
		}

		const caseId = nanoid()

		const dmEmbed = client.createEmbed({
			level: 'info',
			title: `You have been kicked from ${interaction.guild.name}`,
			description: `Reason: ${reason}`,
		})

		await user.send({ embeds: [dmEmbed] }).catch(() => {
			embed.addFields({
				name: 'Failed to DM user',
				value: 'The user may have DMs disabled.',
			})
		})

		await member.kick(reason)

		const caseResult = await moderationPlugin.createCase({
			caseId,
			guildId: interaction.guild.id,
			moderatorId: interaction.user.id,
			userId: user.id,
			type: 'kick',
			reason,
		})

		if (caseResult.isErr()) {
			const embed = client.createEmbed({
				level: 'error',
				title: 'Failed to create kick case',
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
			title: `Successfully kicked ${user.tag}`,
			description: `Reason: ${reason}`,
			footer: {
				text: `Case ID: ${caseId}`,
			},
		})

		await interaction.reply({ embeds: [embed] })

		return ok(undefined)
	},
})
