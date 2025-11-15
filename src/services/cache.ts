// DI
import { singleton } from 'tsyringe'
import { BaseService, type ServiceStatus } from '#core/service'

// error handling
import { err, ok, Result, ResultAsync } from 'neverthrow'
import { ConnectionError, DisconnectionError, StatusError } from '#core/errors'

// cache
import { env } from '#core/env'
import { RedisClient } from 'bun'
import { ICacheService, type ICacheServiceType } from '#interfaces/cache'

@singleton()
export class CacheService extends BaseService implements ICacheServiceType {
	public readonly name = 'cache'
	public readonly token = ICacheService
	private _redis: RedisClient | undefined

	public get redis(): RedisClient {
		if (!this._redis) {
			throw new Error(
				'Cache service not connected. Accessing redis instance is not allowed before connection.',
			)
		}
		return this._redis
	}

	public async connect(): Promise<Result<void, ConnectionError>> {
		this.logger.debug('Connecting to Redis cache...')
		this._redis = new RedisClient(env.REDIS_URL)
		const connectResult = await ResultAsync.fromPromise(
			this._redis.ping(),
			(error) =>
				new ConnectionError('Failed to connect to Redis cache', {
					cause: error as Error,
				}),
		)

		if (connectResult.isErr()) {
			return err(connectResult.error)
		}

		this.logger.info('Redis cache connected successfully.')
		return ok(undefined)
	}

	public async disconnect(): Promise<Result<void, DisconnectionError>> {
		if (this._redis) {
			this.logger.debug('Disconnecting from Redis cache...')
			const result = Result.fromThrowable(
				() => this._redis!.close(),
				(error) =>
					new DisconnectionError('Failed to disconnect from Redis cache', {
						cause: error as Error,
					}),
			)()
			if (result.isOk()) {
				this._redis = undefined
				this.logger.info('Redis cache disconnected successfully.')
			}
			return result
		}
		return ok(undefined)
	}

	public async getStatus(): Promise<Result<ServiceStatus, StatusError>> {
		if (!this._redis) {
			return ok({ connected: false, healthy: false })
		}

		return ResultAsync.fromPromise(this.redis.ping(), (error) => {
			return new StatusError('Failed to get cache status', {
				cause: error as Error,
			})
		}).map(() => ({
			connected: true,
			healthy: true,
		}))
	}

	public async get<T>(key: string): Promise<T | null> {
		const value = await this.redis.get(key)
		return value ? (JSON.parse(value) as T) : null
	}

	public async set<T>(
		key: string,
		value: T,
		ttlSeconds?: number,
	): Promise<void> {
		const stringValue = JSON.stringify(value)
		await this.redis.set(key, stringValue)
		if (ttlSeconds) {
			await this.redis.expire(key, ttlSeconds)
		}
	}

	public async delete(key: string): Promise<void> {
		await this.redis.del(key)
	}
}
