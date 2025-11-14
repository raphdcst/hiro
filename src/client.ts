import 'reflect-metadata'
import { GatewayIntentBits } from 'discord.js'
import { container } from 'tsyringe'
import { BotClient } from '#core/client'

const client = new BotClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	config: {
		features: {
			automod: true,
			logging: true,
			analytics: false,
		},
		limits: {
			maxWarnings: 3,
			banDuration: 86400,
		},
	},
})

container.register(BotClient, { useValue: client })

export { client }
