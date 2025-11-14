import 'reflect-metadata'
import { GatewayIntentBits } from 'discord.js'
import { container } from 'tsyringe'
import { BotClient } from '#core/client'

// services
import { CacheService } from '#services/cache.service'
import { DatabaseService } from '#services/database.service'

// plugins

// commands
import { DatabaseCommand } from '#commands/db.command'
import { PingCommand } from '#commands/ping.command'

const client = new BotClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	services: [DatabaseService, CacheService],
	plugins: [],
	commands: [DatabaseCommand, PingCommand],
	config: {},
})

container.register(BotClient, { useValue: client })

export { client }
