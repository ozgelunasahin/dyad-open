import { eq, and, gt, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hash, verify } from '@node-rs/argon2';
import { db, users, sessions, canvases, cardPositions, shareLinks } from './index';
import type { User, NewUser, Canvas, NewCanvas, CardPosition, NewCardPosition } from './schema';

// ============ User Operations ============

export async function createUser(
	email: string,
	username: string,
	password: string
): Promise<User> {
	const id = nanoid();
	const passwordHash = await hash(password);

	const [user] = await db
		.insert(users)
		.values({
			id,
			email: email.toLowerCase(),
			username: username.toLowerCase(),
			passwordHash
		})
		.returning();

	return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
	return db.query.users.findFirst({
		where: eq(users.email, email.toLowerCase())
	});
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
	return db.query.users.findFirst({
		where: eq(users.username, username.toLowerCase())
	});
}

export async function getUserById(id: string): Promise<User | undefined> {
	return db.query.users.findFirst({
		where: eq(users.id, id)
	});
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	try {
		return await verify(hash, password);
	} catch {
		return false;
	}
}

export async function updateLastLogin(userId: string): Promise<void> {
	await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

// ============ Session Operations ============

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<string> {
	const id = nanoid(32);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await db.insert(sessions).values({
		id,
		userId,
		expiresAt
	});

	return id;
}

export async function validateSession(
	sessionId: string
): Promise<{ user: User; session: { id: string; expiresAt: Date } } | null> {
	const result = await db
		.select({
			session: sessions,
			user: users
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
		.limit(1);

	if (result.length === 0) return null;

	return {
		user: result[0].user,
		session: {
			id: result[0].session.id,
			expiresAt: result[0].session.expiresAt
		}
	};
}

export async function deleteSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteUserSessions(userId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

// ============ Canvas Operations ============

export async function createCanvas(
	userId: string,
	name: string,
	slug: string,
	entryPointNoteId?: string
): Promise<Canvas> {
	const id = nanoid();

	const [canvas] = await db
		.insert(canvases)
		.values({
			id,
			userId,
			name,
			slug: slug.toLowerCase(),
			entryPointNoteId
		})
		.returning();

	return canvas;
}

export async function getCanvasById(id: string): Promise<Canvas | undefined> {
	return db.query.canvases.findFirst({
		where: eq(canvases.id, id)
	});
}

export async function getCanvasByUserAndSlug(
	userId: string,
	slug: string
): Promise<Canvas | undefined> {
	return db.query.canvases.findFirst({
		where: and(eq(canvases.userId, userId), eq(canvases.slug, slug.toLowerCase()))
	});
}

export async function getUserCanvases(userId: string): Promise<Canvas[]> {
	return db.query.canvases.findMany({
		where: eq(canvases.userId, userId),
		orderBy: desc(canvases.updatedAt)
	});
}

export async function updateCanvas(
	id: string,
	data: Partial<Pick<Canvas, 'name' | 'slug' | 'entryPointNoteId' | 'isPublished'>>
): Promise<Canvas | undefined> {
	const [canvas] = await db
		.update(canvases)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(canvases.id, id))
		.returning();

	return canvas;
}

export async function deleteCanvas(id: string): Promise<void> {
	await db.delete(canvases).where(eq(canvases.id, id));
}

export async function getPublishedCanvas(
	username: string,
	slug: string
): Promise<(Canvas & { user: User }) | undefined> {
	const result = await db
		.select({
			canvas: canvases,
			user: users
		})
		.from(canvases)
		.innerJoin(users, eq(canvases.userId, users.id))
		.where(
			and(
				eq(users.username, username.toLowerCase()),
				eq(canvases.slug, slug.toLowerCase()),
				eq(canvases.isPublished, true)
			)
		)
		.limit(1);

	if (result.length === 0) return undefined;

	return {
		...result[0].canvas,
		user: result[0].user
	};
}

// ============ Card Position Operations ============

export async function saveCardPositions(
	canvasId: string,
	positions: NewCardPosition[]
): Promise<void> {
	// Delete all existing positions for this canvas first
	await db.delete(cardPositions).where(eq(cardPositions.canvasId, canvasId));

	// Insert new positions (IDs are now canvasId-noteId format, guaranteed unique)
	if (positions.length > 0) {
		await db.insert(cardPositions).values(
			positions.map((pos) => ({
				...pos,
				id: pos.id || nanoid(),
				canvasId
			}))
		);
	}
}

export async function getCardPositions(canvasId: string): Promise<CardPosition[]> {
	return db.query.cardPositions.findMany({
		where: eq(cardPositions.canvasId, canvasId)
	});
}

// ============ Share Link Operations ============

export async function createShareLink(canvasId: string): Promise<string> {
	const id = nanoid();
	const token = nanoid(21);

	await db.insert(shareLinks).values({
		id,
		token,
		canvasId
	});

	return token;
}

export async function getCanvasByShareToken(
	token: string
): Promise<(Canvas & { user: User }) | undefined> {
	const result = await db
		.select({
			canvas: canvases,
			user: users,
			shareLink: shareLinks
		})
		.from(shareLinks)
		.innerJoin(canvases, eq(shareLinks.canvasId, canvases.id))
		.innerJoin(users, eq(canvases.userId, users.id))
		.where(eq(shareLinks.token, token))
		.limit(1);

	if (result.length === 0) return undefined;

	// Update access count
	await db
		.update(shareLinks)
		.set({
			accessCount: result[0].shareLink.accessCount + 1,
			lastAccessedAt: new Date()
		})
		.where(eq(shareLinks.token, token));

	return {
		...result[0].canvas,
		user: result[0].user
	};
}

export async function deleteShareLink(canvasId: string): Promise<void> {
	await db.delete(shareLinks).where(eq(shareLinks.canvasId, canvasId));
}
