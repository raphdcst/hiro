import type { BunSQLDatabase } from 'drizzle-orm/bun-sql'
import type { Result } from 'neverthrow'
import type { StatusError } from '#core/errors'
import type { ServiceStatus } from '#core/service'

export const IDatabaseService = Symbol('IDatabaseService')

export interface IDatabaseService {
	readonly db: BunSQLDatabase
	getStatus(): Promise<Result<ServiceStatus, StatusError>>
}

export type IDatabaseServiceType = IDatabaseService
