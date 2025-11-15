import type { BunSQLDatabase } from 'drizzle-orm/bun-sql'
import type { Result } from 'neverthrow'
import type { StatusError } from '#core/errors'
import type { ServiceStatus } from '#core/service'

/**
 * The injection token for the database service.
 */
export const IDatabaseService = Symbol('IDatabaseService')

/**
 * The interface for the database service.
 */
export interface IDatabaseService {
	/** The Drizzle database instance. */
	readonly db: BunSQLDatabase
	/**
	 * Retrieves the status of the database service.
	 * @returns A `Result` with the service status or a `StatusError`.
	 */
	getStatus(): Promise<Result<ServiceStatus, StatusError>>
}

/**
 * The type for the database service.
 */
export type IDatabaseServiceType = IDatabaseService
