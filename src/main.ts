import { env } from '#core/env'
import { createLogger } from '#core/logger'
import { client } from './client'

const logger = createLogger('process')

async function main() {
	const environment = {
		environment: env.NODE_ENV,
		logLevel: env.LOG_LEVEL,
	}

	logger.info(`Starting HIRO bot... \n${JSON.stringify(environment)}`)

	const startResult = await client.start()

	if (startResult.isErr()) {
		logger.error('Failed to start bot', { error: startResult.error })
		process.exit(1)
	}

	logger.info('✅ HIRO bot started successfully')

	const shutdown = async (signal: string) => {
		logger.debug(`Received ${signal}, shutting down gracefully...`)

		const stopResult = await client.stop()

		if (stopResult.isErr()) {
			logger.error('Error during shutdown', { error: stopResult.error })
			process.exit(1)
		}

		logger.info('👋 HIRO bot stopped')
		process.exit(0)
	}

	process.on('SIGINT', () => shutdown('SIGINT'))
	process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((error) => {
	logger.error('Fatal error in main', { error })
	process.exit(1)
})
