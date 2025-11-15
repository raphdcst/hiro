import type { RedisClient } from 'bun'

export const ICacheService = Symbol('ICacheService')

export interface ICacheService {
	get<T>(key: string): Promise<T | null>
	set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
	delete(key: string): Promise<void>
	readonly redis: RedisClient
}

export type ICacheServiceType = ICacheService
