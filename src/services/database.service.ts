import { SQL } from 'bun'
import { type BunSQLDatabase, drizzle } from 'drizzle-orm/bun-sql'
import { fromPromise, ok, type Result } from 'neverthrow'
import { singleton } from 'tsyringe'
import { env } from '#core/env'
import {
	ConnectionError,
	type DisconnectionError,
	StatusError,
} from '#core/errors'
import { BaseService, type ServiceStatus } from '#core/service'
import {
	IDatabaseService,
	type IDatabaseService as IDatabaseServiceType,
} from '#interfaces/database.interface'

@singleton()
export class DatabaseService
	extends BaseService
	implements IDatabaseServiceType
{
	public readonly name = 'database'
	public readonly token = IDatabaseService
	private _db: BunSQLDatabase | undefined
	private _sql: SQL | undefined

	public get db(): BunSQLDatabase {
		if (!this._db) {
			throw new Error(
				'Database service not connected. Accessing db instance is not allowed before connection.',
			)
		}
		return this._db
	}

	public get sql(): SQL {
		if (!this._sql) {
			throw new Error(
				'Database service not connected. Accessing sql instance is not allowed before connection.',
			)
		}
		return this._sql
	}

	public async connect(): Promise<Result<void, ConnectionError>> {
		this.logger.debug('Connecting to database...')

		this._sql = new SQL(env.DATABASE_URL)
		this._db = drizzle(this._sql)

		const result = fromPromise(
			this._sql`SELECT 1`,
			(error) =>
				new ConnectionError('Failed to connect to database', {
					cause: error as Error,
				}),
		).map(() => void this.logger.info('Database connection established.'))

		return result
	}

	public async disconnect(): Promise<Result<void, DisconnectionError>> {
		if (this._sql) {
			this.logger.debug('Disconnecting from database...')
			await this._sql.end()
			this._sql = undefined
			this._db = undefined
			this.logger.info('Database connection closed.')
		}
		return ok(undefined)
	}

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
