// DI
import { singleton } from 'tsyringe'
import { BaseService, type ServiceStatus } from '#core/service'

// error handling
import { ok, type Result, ResultAsync } from 'neverthrow'
import {
	type ConnectionError,
	type DisconnectionError,
	StatusError,
} from '#core/errors'

// cache
import { env } from '#core/env'
import { RedisClient } from 'bun'
import { ICacheService, type ICacheServiceType } from '#interfaces/cache'
import { handleConnection, handleDisconnection } from '../utils/connection'

/**
 * Service for interacting with the Redis cache.
 * @implements ICacheServiceType
 */
@singleton()
export class CacheService extends BaseService implements ICacheServiceType {
	public readonly name = 'cache'
	public readonly token = ICacheService
	private _redis: RedisClient | undefined

	/**
	 * The Redis client instance.
	 * @throws {Error} If the cache service is not connected.
	 */
	public get redis(): RedisClient {
		if (!this._redis) {
			throw new Error(
				'Cache service not connected. Accessing redis instance is not allowed before connection.',
			)
		}
		return this._redis
	}

	/**
	 * Connects to the Redis cache.
	 * @returns A `Result` indicating success or a `ConnectionError`.
	 */
	public async connect(): Promise<Result<void, ConnectionError>> {
		this.logger.debug('Connecting to Redis cache...')
		this._redis = new RedisClient(env.REDIS_URL)

		return handleConnection(
			this._redis.ping(),
			'Redis cache connected successfully.',
			'Failed to connect to Redis cache',
			this.logger,
		)
	}

	/**
	 * Disconnects from the Redis cache.
	 * @returns A `Result` indicating success or a `DisconnectionError`.
	 */
	public async disconnect(): Promise<Result<void, DisconnectionError>> {
		if (!this._redis) {
			return ok(undefined)
		}

		this.logger.debug('Disconnecting from Redis cache...')

		return handleDisconnection(
			() => this._redis!.close(),
			'Redis cache disconnected successfully.',
			'Failed to disconnect from Redis cache',
			this.logger,
			() => {
				this._redis = undefined
			},
		)
	}

	/**
	 * Retrieves the status of the cache service.
	 * @returns A `Result` with the service status or a `StatusError`.
	 */
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

	/**
	 * Retrieves a value from the cache.
	 * @param key The key of the value to retrieve.
	 * @returns The cached value or null if not found.
	 */
	public async get<T>(key: string): Promise<T | null> {
		const value = await this.redis.get(key)
		return value ? (JSON.parse(value) as T) : null
	}

	/**
	 * Stores a value in the cache.
	 * @param key The key of the value to store.
	 * @param value The value to store.
	 * @param ttlSeconds The time-to-live in seconds.
	 */
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

	/**
	 * Deletes a value from the cache.
	 * @param key The key of the value to delete.
	 */
	public async delete(key: string): Promise<void> {
		await this.redis.del(key)
	}
}
