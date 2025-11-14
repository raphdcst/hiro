import type { ChatInputCommandInteraction } from 'discord.js'
import type { Result } from 'neverthrow'
import type { BotClient } from '#core/client'
import type { MiddlewareError } from './errors'

export class TypedMetadata {
	private store = new Map<string, unknown>()

	public set<T>(key: string, value: T): void {
		this.store.set(key, value)
	}

	public get<T>(key: string): T | undefined {
		return this.store.get(key) as T | undefined
	}

	public has(key: string): boolean {
		return this.store.has(key)
	}

	public delete(key: string): boolean {
		return this.store.delete(key)
	}

	public clear(): void {
		this.store.clear()
	}

	public keys(): IterableIterator<string> {
		return this.store.keys()
	}
}

export interface CommandContext {
	interaction: ChatInputCommandInteraction
	client: BotClient
	metadata: TypedMetadata
}

export type Middleware = (
	ctx: CommandContext,
	next: () => Promise<Result<void, MiddlewareError>>,
) => Promise<Result<void, MiddlewareError>>
