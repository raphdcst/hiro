import type { BunSQLDatabase } from 'drizzle-orm/bun-sql'

export const IDatabaseService = Symbol('IDatabaseService')

export interface IDatabaseService {
	readonly db: BunSQLDatabase
}
