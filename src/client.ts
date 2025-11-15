import 'reflect-metadata'
import { GatewayIntentBits } from 'discord.js'
import { container } from 'tsyringe'
import { BotClient } from '#core/client'

// services
import { CacheService } from '#services/cache'
import { DatabaseService } from '#services/database'

// plugins

// commands
import { ping } from '#commands/ping.native'
import { db } from '#commands/db.native'

const client = new BotClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	services: [DatabaseService, CacheService],
	plugins: [],
	commands: [ping, db],
	config: {},
})

container.register(BotClient, { useValue: client })

export { client }
