import { GatewayIntentBits } from 'discord.js'
import { BotClient, container, createLogger, env } from 'hiro'

import { CacheService, DatabaseService } from '@hiro/services'

import { ModerationPlugin } from '@hiro/plugins'

import {
	ban,
	db,
	help,
	history,
	info,
	kick,
	mute,
	ping,
	unmute,
	warn,
} from '@hiro/commands'

const logger = createLogger('process')

const client = new BotClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	services: [DatabaseService, CacheService],
	plugins: [ModerationPlugin],
	commands: [ping, db, help, info, warn, kick, ban, history, mute, unmute],
	config: {
		embed: {
			footer: {
				text: 'HIRO',
			},
		},
	},
})

container.register(BotClient, { useValue: client })

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
