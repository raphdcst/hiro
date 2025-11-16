import { inject, singleton } from 'tsyringe'
import { BasePlugin } from '#core/plugin'
import {
	IDatabaseService,
	type IDatabaseServiceType,
} from '#interfaces/database'
import { moderation } from '../database/schemas/moderation'
import { and, eq } from 'drizzle-orm'
import { type Result, err, ok } from 'neverthrow'
import { PluginError } from '#core/errors'

export type ModerationCase = typeof moderation.$inferSelect
export type NewModerationCase = typeof moderation.$inferInsert

@singleton()
export class ModerationPlugin extends BasePlugin {
	public readonly name = 'moderation'

	constructor(
		@inject(IDatabaseService)
		private readonly db: IDatabaseServiceType,
	) {
		super()
	}

	public async createCase(
		caseParams: NewModerationCase,
	): Promise<Result<ModerationCase, PluginError>> {
		try {
			const newCase = await this.db.db
				.insert(moderation)
				.values(caseParams)
				.returning()

			if (!newCase[0]) {
				return err(new PluginError('Failed to create moderation case'))
			}

			return ok(newCase[0])
		} catch (error) {
			return err(
				new PluginError('Failed to create moderation case', {
					cause: error as Error,
				}),
			)
		}
	}

	public async getCase(
		caseId: string,
		guildId: string,
	): Promise<Result<ModerationCase | undefined, PluginError>> {
		try {
			const caseResult = await this.db.db
				.select()
				.from(moderation)
				.where(
					and(eq(moderation.caseId, caseId), eq(moderation.guildId, guildId)),
				)

			return ok(caseResult[0])
		} catch (error) {
			return err(
				new PluginError('Failed to get moderation case', {
					cause: error as Error,
				}),
			)
		}
	}

	public async getUserCases(
		userId: string,
		guildId: string,
	): Promise<Result<ModerationCase[], PluginError>> {
		try {
			const cases = await this.db.db
				.select()
				.from(moderation)
				.where(
					and(eq(moderation.userId, userId), eq(moderation.guildId, guildId)),
				)

			return ok(cases)
		} catch (error) {
			return err(
				new PluginError('Failed to get user moderation cases', {
					cause: error as Error,
				}),
			)
		}
	}

	public async updateCase(
		caseId: string,
		guildId: string,
		caseParams: Partial<NewModerationCase>,
	): Promise<Result<ModerationCase, PluginError>> {
		try {
			const updatedCase = await this.db.db
				.update(moderation)
				.set(caseParams)
				.where(
					and(eq(moderation.caseId, caseId), eq(moderation.guildId, guildId)),
				)
				.returning()

			if (!updatedCase[0]) {
				return err(new PluginError('Failed to update moderation case'))
			}

			return ok(updatedCase[0])
		} catch (error) {
			return err(
				new PluginError('Failed to update moderation case', {
					cause: error as Error,
				}),
			)
		}
	}
}
