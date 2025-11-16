import { ok } from 'neverthrow'
import { createCommand } from '#core/command'
import {
	IDatabaseService,
	type IDatabaseService as IDatabaseServiceType,
} from '#interfaces/database'
import { loggerMiddleware } from '#middlewares/logger'
import { createEmbed } from '#utils/embed'

export const db = createCommand({
	data: {
		name: 'db',
		description: 'Test the database connection.',
	},
	run: async ({ interaction, container }) => {
		const db = container.resolve<IDatabaseServiceType>(IDatabaseService)
		const result = await db.getStatus()

		if (result.isErr()) {
			const embed = createEmbed({
				level: 'error',
				title: 'Database connection failed',
				description: result.error.message,
			})
			await interaction.reply({
				embeds: [embed],
			})
			return ok(undefined)
		}

		const embed = createEmbed({
			level: 'success',
			title: 'Database connection successful',
			description: `Database status: ${JSON.stringify(result.value)}`,
		})

		await interaction.reply({
			embeds: [embed],
		})

		return ok(undefined)
	},
	middlewares: [loggerMiddleware()],
})
