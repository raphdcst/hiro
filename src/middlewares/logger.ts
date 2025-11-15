import { ok } from 'neverthrow'
import { createLogger } from '#core/logger'
import type { Middleware } from '#core/middleware'

export const loggerMiddleware = (): Middleware => {
	const logger = createLogger('logger', 'middleware')

	return async (ctx, next) => {
		logger.info(`Executing command: ${ctx.interaction.commandName}`)
		ctx.metadata.set('startTime', performance.now())

		const result = await next()

		const startTime = ctx.metadata.get<number>('startTime') ?? 0
		const duration = (performance.now() - startTime).toFixed(2)

		result.match(
			() =>
				logger.info(
					`Command ${ctx.interaction.commandName} finished successfully in ${duration}ms`,
				),
			(error) =>
				logger.error(
					`Command ${ctx.interaction.commandName} failed after ${duration}ms`,
					{ error },
				),
		)

		return ok(undefined)
	}
}
