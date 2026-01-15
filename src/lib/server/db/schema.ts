import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	lastLoginAt: integer('last_login_at', { mode: 'timestamp' })
});

// Sessions table
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// Canvases table
export const canvases = sqliteTable(
	'canvases',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		entryPointNoteId: text('entry_point_note_id'),
		isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [unique('user_slug_unique').on(table.userId, table.slug)]
);

// Card positions (per-canvas state)
export const cardPositions = sqliteTable('card_positions', {
	id: text('id').primaryKey(),
	canvasId: text('canvas_id')
		.notNull()
		.references(() => canvases.id, { onDelete: 'cascade' }),
	noteId: text('note_id').notNull(),
	x: real('x').notNull(),
	y: real('y').notNull(),
	width: real('width').notNull(),
	height: real('height').notNull(),
	parentCardId: text('parent_card_id'),
	sourceLinkX: real('source_link_x'),
	sourceLinkY: real('source_link_y')
});

// Share links (capability URLs for publishing)
export const shareLinks = sqliteTable('share_links', {
	id: text('id').primaryKey(),
	token: text('token').notNull().unique(),
	canvasId: text('canvas_id')
		.notNull()
		.references(() => canvases.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	accessCount: integer('access_count').notNull().default(0),
	lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' })
});

// Type exports for use in operations
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;
export type CardPosition = typeof cardPositions.$inferSelect;
export type NewCardPosition = typeof cardPositions.$inferInsert;
export type ShareLink = typeof shareLinks.$inferSelect;
export type NewShareLink = typeof shareLinks.$inferInsert;
