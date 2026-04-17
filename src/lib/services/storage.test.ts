import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStorageService } from './storage.js';

describe('SupabaseStorageService', () => {
	function mockSupabaseStorage(overrides?: {
		uploadError?: Error | null;
		publicUrlValue?: string;
	}): SupabaseClient {
		const from = vi.fn(() => ({
			upload: vi.fn(async () => ({
				data: overrides?.uploadError ? null : { path: 'ignored' },
				error: overrides?.uploadError ?? null
			})),
			getPublicUrl: vi.fn(() => ({
				data: {
					publicUrl:
						overrides?.publicUrlValue ??
						'https://example.supabase.co/storage/v1/object/public/uploads/abc.jpg'
				}
			}))
		}));
		return { storage: { from } } as unknown as SupabaseClient;
	}

	it('happy path — upload returns the public URL and stored path', async () => {
		const supabase = mockSupabaseStorage();
		const service = new SupabaseStorageService(supabase);
		const file = new Blob(['hello'], { type: 'image/jpeg' });

		const result = await service.upload('uploads', 'abc.jpg', file);

		expect(result).toEqual({
			url: 'https://example.supabase.co/storage/v1/object/public/uploads/abc.jpg',
			path: 'abc.jpg'
		});
	});

	it('error path — upload throws a plain Error (not DomainError) so handleServiceError returns a generic 500', async () => {
		const supabase = mockSupabaseStorage({
			uploadError: new Error('bucket not found')
		});
		const service = new SupabaseStorageService(supabase);
		const file = new Blob(['hello'], { type: 'image/jpeg' });

		await expect(service.upload('uploads', 'abc.jpg', file)).rejects.toThrow(
			/Storage upload failed/
		);
	});

	it('publicUrl — returns whatever the SDK returns (no network round-trip)', () => {
		const supabase = mockSupabaseStorage({
			publicUrlValue: 'https://eu.example.com/covers/x.png'
		});
		const service = new SupabaseStorageService(supabase);

		expect(service.publicUrl('covers', 'x.png')).toBe(
			'https://eu.example.com/covers/x.png'
		);
	});
});
