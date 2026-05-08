import type { SupabaseClient } from '@supabase/supabase-js';
import type { JSONContent } from '@tiptap/core';
import { nanoid } from 'nanoid';
import type { Prompt, TimeSlotInput } from '$lib/domain/types.js';
import { canPublish, canUnpublish } from '$lib/domain/prompt.js';
import { deriveGeneralArea, validateRegion } from '$lib/services/location.js';
import { DomainError } from '$lib/domain/errors.js';

export interface PromptCommandService {
	create(
		authorId: string,
		data: { title?: string; body?: JSONContent; coverImageUrl?: string }
	): Promise<Prompt>;

	update(
		promptId: string,
		authorId: string,
		data: { title?: string; body?: JSONContent; coverImageUrl?: string }
	): Promise<Prompt>;

	publish(
		promptId: string,
		authorId: string,
		slots: TimeSlotInput[],
		audienceScope?: string | null
	): Promise<void>;

	addSlots(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void>;

	editSlot(slotId: string, authorId: string, updates: Partial<TimeSlotInput>): Promise<void>;

	removeSlot(slotId: string, authorId: string): Promise<void>;

	unpublish(promptId: string, authorId: string): Promise<void>;

	deleteDraft(promptId: string, authorId: string): Promise<void>;

	deletePrompt(promptId: string, authorId: string): Promise<void>;
}

export class SupabasePromptCommandService implements PromptCommandService {
	constructor(private supabase: SupabaseClient) {}

	async create(
		authorId: string,
		data: { title?: string; body?: JSONContent; coverImageUrl?: string }
	): Promise<Prompt> {
		const id = nanoid();
		const { data: prompt, error } = await this.supabase
			.from('prompts')
			.insert({
				id,
				author_id: authorId,
				title: data.title ?? null,
				body: data.body ?? null,
				cover_image_url: data.coverImageUrl ?? null
			})
			.select()
			.single();

		if (error) throw new Error(`Failed to create prompt: ${error.message}`);
		return prompt as Prompt;
	}

	async update(
		promptId: string,
		authorId: string,
		data: { title?: string; body?: JSONContent; coverImageUrl?: string }
	): Promise<Prompt> {
		const updates: Record<string, unknown> = {};
		if (data.title !== undefined) updates.title = data.title;
		if (data.body !== undefined) updates.body = data.body;
		if (data.coverImageUrl !== undefined) updates.cover_image_url = data.coverImageUrl;

		const { data: prompt, error } = await this.supabase
			.from('prompts')
			.update(updates)
			.eq('id', promptId)
			.eq('author_id', authorId)
			.select()
			.single();

		if (error) throw new Error(`Failed to update prompt: ${error.message}`);
		return prompt as Prompt;
	}

	async publish(
		promptId: string,
		authorId: string,
		slots: TimeSlotInput[],
		audienceScope: string | null = null
	): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);

		// Per-slot validation first — surfaces specific errors like "Start time
		// must be at least 1 hour in the future" instead of the generic
		// canPublish failure when a slot is past or near-past.
		for (const slot of slots) this.validateSlotFields(slot);

		if (!canPublish(prompt, slots)) {
			throw new DomainError('Cannot publish: conversation must be a draft with 1–3 valid time slots');
		}

		// audience_scope is set here, then publish_prompt flips state. Once
		// published, audience_scope is immutable (no cross-scope promotion).
		const { error: scopeError } = await this.supabase
			.from('prompts')
			.update({ audience_scope: audienceScope })
			.eq('id', promptId)
			.eq('author_id', authorId);
		if (scopeError) {
			throw new Error(`Failed to set audience scope: ${scopeError.message}`);
		}

		const derivedSlots = await this.deriveSlotRows(slots, prompt.region);
		await this.callPublishRpc(promptId, derivedSlots);
	}

	async addSlots(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);

		// 3-slot ceiling: count existing future-valid non-accepted slots.
		// "Expired" is derived from start_time alone — no separate stamp.
		const { count } = await this.supabase
			.from('time_slots')
			.select('id', { count: 'exact', head: true })
			.eq('prompt_id', promptId)
			.eq('accepted', false)
			.gt('start_time', new Date().toISOString());

		if ((count ?? 0) + slots.length > 3) {
			throw new DomainError('Cannot exceed 3 available slots per conversation');
		}

		await this.validateAndInsertSlots(promptId, slots, prompt.region);
	}

	async editSlot(slotId: string, authorId: string, updates: Partial<TimeSlotInput>): Promise<void> {
		const slot = await this.getOwnSlot(slotId, authorId);
		if (slot.accepted) {
			throw new DomainError('Cannot edit a slot that has already been booked');
		}

		const prompt = await this.getOwnPrompt(slot.prompt_id, authorId);

		// Validate individual fields if provided
		if (updates.start_time !== undefined) {
			const startDate = new Date(updates.start_time);
			if (isNaN(startDate.getTime())) {
				throw new DomainError('Start time must be a valid date');
			}
			const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
			if (startDate < oneHourFromNow) {
				throw new DomainError('Start time must be at least 1 hour in the future');
			}
		}
		if (updates.duration_minutes !== undefined) {
			if (!Number.isInteger(updates.duration_minutes) || updates.duration_minutes < 15 || updates.duration_minutes > 480) {
				throw new DomainError('Duration must be between 15 and 480 minutes');
			}
		}

		const fields: Record<string, unknown> = {};
		if (updates.start_time !== undefined) fields.start_time = updates.start_time;
		if (updates.duration_minutes !== undefined) fields.duration_minutes = updates.duration_minutes;

		if (updates.location) {
			if (!validateRegion(updates.location, prompt.region)) {
				throw new DomainError('Location is outside Berlin');
			}
			const area = await deriveGeneralArea(updates.location);
			fields.exact_location = updates.location;
			fields.general_area = area.generalArea;
			fields.general_area_lat = area.centroidLat;
			fields.general_area_lng = area.centroidLng;
		}

		// No-op when no field actually changed. Skipping the UPDATE here also
		// skips expirePendingInvitations — the save-on-close flow can route
		// every persisted slot through editSlot, but only the ones that
		// actually changed should withdraw their pending invitations.
		if (Object.keys(fields).length === 0) {
			return;
		}

		await this.expirePendingInvitations(slotId);

		const { error } = await this.supabase
			.from('time_slots')
			.update(fields)
			.eq('id', slotId);

		if (error) throw new Error(`Failed to edit slot: ${error.message}`);
	}

	async removeSlot(slotId: string, authorId: string): Promise<void> {
		const slot = await this.getOwnSlot(slotId, authorId);
		if (slot.accepted) {
			throw new DomainError('Cannot remove a slot that has already been booked');
		}

		await this.getOwnPrompt(slot.prompt_id, authorId);

		// Auto-expire pending invitations when slot is removed
		await this.expirePendingInvitations(slotId);

		const { error } = await this.supabase
			.from('time_slots')
			.delete()
			.eq('id', slotId);

		if (error) throw new Error(`Failed to remove slot: ${error.message}`);
	}

	async unpublish(promptId: string, authorId: string): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);
		if (!canUnpublish(prompt)) {
			throw new DomainError('Can only unpublish a published conversation');
		}

		// Active meetings are not guarded — they live in their own table and
		// stay reachable via /meetings/[id] regardless of prompt state.
		// Pending invitations on this prompt's slots are expired below; the
		// invitee won't see a stale invite for an off-feed conversation.
		// Concurrent invitee-accept during this window: eventual consistency.
		// If the accept commits before the invitation-expire UPDATE, the
		// meeting is honored; if reversed, invitee gets "no longer available".
		const { error } = await this.supabase
			.from('prompts')
			.update({ state: 'draft' })
			.eq('id', promptId)
			.eq('author_id', authorId);

		if (error) throw new Error(`Failed to unpublish prompt: ${error.message}`);

		await this.expirePromptInvitations(promptId);
	}

	async deleteDraft(promptId: string, authorId: string): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);
		if (prompt.state !== 'draft') {
			throw new DomainError('Can only discard drafts');
		}

		const { error } = await this.supabase
			.from('prompts')
			.delete()
			.eq('id', promptId)
			.eq('author_id', authorId);

		if (error) throw new Error(`Failed to delete prompt: ${error.message}`);
	}

	async deletePrompt(promptId: string, authorId: string): Promise<void> {
		await this.getOwnPrompt(promptId, authorId); // ownership check
		await this.guardNoActiveMeetings(promptId);

		const { error } = await this.supabase
			.from('prompts')
			.delete()
			.eq('id', promptId)
			.eq('author_id', authorId);

		if (error) throw new Error(`Failed to delete prompt: ${error.message}`);
	}

	/** Throws if the prompt has any scheduled/active meetings. */
	private async guardNoActiveMeetings(promptId: string): Promise<void> {
		const { data } = await this.supabase
			.from('meetings')
			.select('id')
			.eq('prompt_id', promptId)
			.in('state', ['scheduled', 'active'])
			.limit(1);

		if (data && data.length > 0) {
			throw new DomainError('Cannot delete a conversation with a scheduled meeting.');
		}
	}

	// Private helpers

	/** Expire pending invitations for a slot being modified/removed via SECURITY DEFINER RPC. */
	private async expirePendingInvitations(slotId: string): Promise<void> {
		const { error } = await this.supabase.rpc('expire_slot_invitations', {
			p_slot_id: slotId
		});
		if (error) throw new Error(`Failed to expire slot invitations: ${error.message}`);
	}

	/** Expire all pending invitations on a prompt's slots — called on unpublish. */
	private async expirePromptInvitations(promptId: string): Promise<void> {
		const { error } = await this.supabase.rpc('expire_prompt_invitations', {
			p_prompt_id: promptId
		});
		if (error) throw new Error(`Failed to expire prompt invitations: ${error.message}`);
	}

	private async getOwnPrompt(promptId: string, authorId: string): Promise<Prompt> {
		const { data, error } = await this.supabase
			.from('prompts')
			.select('*')
			.eq('id', promptId)
			.eq('author_id', authorId)
			.single();

		if (error || !data) throw new DomainError('Conversation not found', 404);
		return data as Prompt;
	}

	private async getOwnSlot(
		slotId: string,
		authorId: string
	): Promise<{ id: string; prompt_id: string; accepted: boolean }> {
		const { data, error } = await this.supabase
			.from('time_slots')
			.select('id, prompt_id, accepted, prompts!inner(author_id)')
			.eq('id', slotId)
			.single();

		if (error || !data) throw new DomainError('Slot not found', 404);

		// Check ownership via the joined prompt
		const prompt = (data as Record<string, unknown>).prompts as { author_id: string } | null;
		if (!prompt || prompt.author_id !== authorId) {
			throw new DomainError('Slot not found', 404);
		}

		return { id: data.id, prompt_id: data.prompt_id, accepted: data.accepted };
	}

	private validateSlotFields(slot: TimeSlotInput): void {
		// start_time: must be valid ISO 8601, at least 1 hour in the future
		const startDate = new Date(slot.start_time);
		if (isNaN(startDate.getTime())) {
			throw new DomainError('Start time must be a valid date');
		}
		const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
		if (startDate < oneHourFromNow) {
			throw new DomainError('Start time must be at least 1 hour in the future');
		}

		// duration_minutes: integer, 15-480
		if (!Number.isInteger(slot.duration_minutes) || slot.duration_minutes < 15 || slot.duration_minutes > 480) {
			throw new DomainError('Duration must be between 15 and 480 minutes');
		}

		// location: required fields with correct types
		const loc = slot.location;
		if (!loc || typeof loc !== 'object') {
			throw new DomainError('Location is required');
		}
		if (typeof loc.name !== 'string' || !loc.name.trim()) {
			throw new DomainError('Location name is required');
		}
		if (typeof loc.address !== 'string' || !loc.address.trim()) {
			throw new DomainError('Location address is required');
		}
		if (typeof loc.lat !== 'number' || loc.lat < -90 || loc.lat > 90) {
			throw new DomainError('Invalid location coordinates');
		}
		if (typeof loc.lng !== 'number' || loc.lng < -180 || loc.lng > 180) {
			throw new DomainError('Invalid location coordinates');
		}
	}

	/** For addSlots — direct insert path on a public prompt, NOT used by publish. */
	private async validateAndInsertSlots(
		promptId: string,
		slots: TimeSlotInput[],
		region: string
	): Promise<void> {
		const rows = await this.deriveSlotRows(slots, region, promptId);
		const { error } = await this.supabase.from('time_slots').insert(rows);
		if (error) throw new Error(`Failed to create time slots: ${error.message}`);
	}

	/** Validate + reverse-geocode slots into DB-shaped rows (no insert). */
	private async deriveSlotRows(
		slots: TimeSlotInput[],
		region: string,
		promptId?: string
	): Promise<Array<{
		prompt_id?: string;
		start_time: string;
		duration_minutes: number;
		exact_location: unknown;
		general_area: string;
		general_area_lat: number;
		general_area_lng: number;
	}>> {
		// Validate + region-check all slots up-front so we fail fast without
		// hitting Nominatim if any slot is invalid.
		for (const slot of slots) {
			this.validateSlotFields(slot);
			if (!validateRegion(slot.location, region)) {
				throw new DomainError(`"${slot.location.name}" is outside Berlin`);
			}
		}

		// Reverse-geocode all slots in parallel. Each deriveGeneralArea call
		// already has a 6s AbortController timeout and falls back to "Berlin"
		// on failure, so worst-case wall time is ~7s regardless of slot count
		// instead of N × 7s for the sequential version.
		const areas = await Promise.all(slots.map((s) => deriveGeneralArea(s.location)));

		return slots.map((slot, i) => ({
			...(promptId ? { prompt_id: promptId } : {}),
			start_time: slot.start_time,
			duration_minutes: slot.duration_minutes,
			exact_location: slot.location,
			general_area: areas[i].generalArea,
			general_area_lat: areas[i].centroidLat,
			general_area_lng: areas[i].centroidLng
		}));
	}

	/** Publish / republish through the atomic SECURITY DEFINER RPC. */
	private async callPublishRpc(
		promptId: string,
		slots: Array<{
			start_time: string;
			duration_minutes: number;
			exact_location: unknown;
			general_area: string;
			general_area_lat: number;
			general_area_lng: number;
		}>
	): Promise<void> {
		const { error } = await this.supabase.rpc('publish_prompt', {
			p_prompt_id: promptId,
			p_slots: slots
		});
		if (error) throw new Error(`Failed to publish prompt: ${error.message}`);
	}
}
