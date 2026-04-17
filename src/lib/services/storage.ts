import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * File storage abstraction. Wraps the concrete provider (Supabase Storage today)
 * so callers don't import `supabase.storage` directly. One swap point here when
 * we move to S3-compatible EU object storage — Hetzner, Scaleway, OVH — instead
 * of forty grep-and-replace passes across the codebase.
 *
 * Kept minimal: only the two operations the app actually performs today.
 * Add methods lazily when a real caller needs one, not speculatively.
 */
export interface StorageService {
	/** Uploads a file to the named bucket at the given path. Returns the public URL + the stored path. */
	upload(
		bucket: string,
		path: string,
		file: File | Blob,
		options?: { cacheControl?: string; upsert?: boolean }
	): Promise<{ url: string; path: string }>;

	/** Returns the public URL for an already-stored object. No network round-trip. */
	publicUrl(bucket: string, path: string): string;
}

export class SupabaseStorageService implements StorageService {
	constructor(private supabase: SupabaseClient) {}

	async upload(
		bucket: string,
		path: string,
		file: File | Blob,
		options?: { cacheControl?: string; upsert?: boolean }
	): Promise<{ url: string; path: string }> {
		const { error } = await this.supabase.storage.from(bucket).upload(path, file, {
			cacheControl: options?.cacheControl ?? '31536000',
			upsert: options?.upsert ?? false
		});

		if (error) {
			// Do not wrap Supabase storage errors in DomainError — they carry
			// bucket / provider details that shouldn't leak. handleServiceError
			// turns a generic Error into a 500 with a reference ID.
			throw new Error(`Storage upload failed: ${error.message}`);
		}

		return { url: this.publicUrl(bucket, path), path };
	}

	publicUrl(bucket: string, path: string): string {
		const {
			data: { publicUrl }
		} = this.supabase.storage.from(bucket).getPublicUrl(path);
		return publicUrl;
	}
}
