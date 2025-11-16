import {
	boolean,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core'

export const moderation = pgTable('moderation', {
	id: serial('id').primaryKey(),
	caseId: varchar('case_id', { length: 255 }).unique(),
	guildId: varchar('guild_id', { length: 255 }).notNull(),
	userId: varchar('user_id', { length: 255 }).notNull(),
	moderatorId: varchar('moderator_id', { length: 255 }).notNull(),
	type: text('type', {
		enum: ['warn', 'mute', 'kick', 'ban', 'unmute'],
	}).notNull(),
	reason: text('reason'),
	duration: integer('duration'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	expiresAt: timestamp('expires_at'),
	active: boolean('active').default(true),
})
