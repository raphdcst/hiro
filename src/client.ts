import 'reflect-metadata'
import { GatewayIntentBits } from 'discord.js'
import { container } from 'tsyringe'
import { BotClient } from '#core/client'

// services
import { CacheService } from '#services/cache'
import { DatabaseService } from '#services/database'

// plugins
import { ModerationPlugin } from '#plugins/moderation.plugin'

// commands
import { ping } from '#commands/ping.native'
import { db } from '#commands/db.native'
import { help } from '#commands/help.native'
import { info } from '#commands/info.native'
import { warn } from '#commands/warn.native'
import { kick } from '#commands/kick.native'
import { ban } from '#commands/ban.native'
import { history } from '#commands/history.native'
import { mute } from '#commands/mute.native'
import { unmute } from '#commands/unmute.native'

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
			timestamp: new Date().toISOString(),
		},
	},
})

container.register(BotClient, { useValue: client })

export { client }
