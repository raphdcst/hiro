import { SQL } from 'bun'
import { type BunSQLDatabase, drizzle } from 'drizzle-orm/bun-sql'
import { fromPromise, ok, type Result } from 'neverthrow'
import { singleton } from 'tsyringe'
import { env } from '#core/env'
import {
	type ConnectionError,
	type DisconnectionError,
	StatusError,
} from '#core/errors'
import { BaseService, type ServiceStatus } from '#core/service'
import {
	IDatabaseService,
	type IDatabaseServiceType,
} from '#interfaces/database'
import { handleConnection, handleDisconnection } from '../utils/connection'

/**
 * Service for interacting with the database.
 * @implements IDatabaseServiceType
 */
@singleton()
export class DatabaseService
	extends BaseService
	implements IDatabaseServiceType
{
	public readonly name = 'database'
	public readonly token = IDatabaseService
	private _db: BunSQLDatabase | undefined
	private _sql: SQL | undefined

	/**
	 * The Drizzle database instance.
	 * @throws {Error} If the database service is not connected.
	 */
	public get db(): BunSQLDatabase {
		if (!this._db) {
			throw new Error(
				'Database service not connected. Accessing db instance is not allowed before connection.',
			)
		}
		return this._db
	}

	/**
	 * The Bun SQL instance.
	 * @throws {Error} If the database service is not connected.
	 */
	public get sql(): SQL {
		if (!this._sql) {
			throw new Error(
				'Database service not connected. Accessing sql instance is not allowed before connection.',
			)
		}
		return this._sql
	}

	/**
	 * Connects to the database.
	 * @returns A `Result` indicating success or a `ConnectionError`.
	 */
	public async connect(): Promise<Result<void, ConnectionError>> {
		this.logger.debug('Connecting to database...')

		this._sql = new SQL(env.DATABASE_URL)
		this._db = drizzle(this._sql)

		return handleConnection(
			this._sql`SELECT 1`,
			'Database connection established.',
			'Failed to connect to database',
			this.logger,
		)
	}

	/**
	 * Disconnects from the database.
	 * @returns A `Result` indicating success or a `DisconnectionError`.
	 */
	public async disconnect(): Promise<Result<void, DisconnectionError>> {
		if (!this._sql) {
			return ok(undefined)
		}

		this.logger.debug('Disconnecting from database...')
		return handleDisconnection(
			() => this._sql?.close(),
			'Database disconnected successfully.',
			'Failed to disconnect from database',
			this.logger,
		)
	}

	/**
	 * Retrieves the status of the database service.
	 * @returns A `Result` with the service status or a `StatusError`.
	 */
	public async getStatus(): Promise<Result<ServiceStatus, StatusError>> {
		if (!this._sql || !this._db) {
			return ok({ connected: false, healthy: false })
		}

		const result = await fromPromise(
			this._sql`SELECT 1`,
			(error) =>
				new StatusError('Failed to get database status', {
					cause: error as Error,
				}),
		)

		return result.map((queryResult) => ({
			connected: true,
			healthy: queryResult.count === 1,
		}))
	}
}
