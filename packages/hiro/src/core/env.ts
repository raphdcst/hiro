import { z } from 'zod/v4'

const EnvSchema = z.object({
	// global
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),

	// discord
	DISCORD_TOKEN: z.string().min(1),
	DISCORD_CLIENT_ID: z.string().min(1),

	// logger
	LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

	// services
	DATABASE_URL: z.url(),
	REDIS_URL: z.url(),
})

type Env = z.infer<typeof EnvSchema>

function loadEnv(): Env {
	const parsed = EnvSchema.safeParse(process.env)

	if (!parsed.success) {
		console.error(
			'Invalid environment variables:',
			JSON.stringify(parsed.error.issues, null, 2),
		)
		process.exit(1)
	}

	return parsed.data
}

export const env = loadEnv()
