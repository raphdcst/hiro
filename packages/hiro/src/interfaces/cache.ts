import type { RedisClient } from 'bun'

/**
 * The injection token for the cache service.
 */
export const ICacheService = Symbol('ICacheService')

/**
 * The interface for the cache service.
 */
export interface ICacheService {
	/**
	 * Retrieves a value from the cache.
	 * @param key The key of the value to retrieve.
	 * @returns The cached value or null if not found.
	 */
	get<T>(key: string): Promise<T | null>
	/**
	 * Stores a value in the cache.
	 * @param key The key of the value to store.
	 * @param value The value to store.
	 * @param ttlSeconds The time-to-live in seconds.
	 */
	set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
	/**
	 * Deletes a value from the cache.
	 * @param key The key of the value to delete.
	 */
	delete(key: string): Promise<void>
	/** The Redis client instance. */
	readonly redis: RedisClient
}

/**
 * The type for the cache service.
 */
export type ICacheServiceType = ICacheService
