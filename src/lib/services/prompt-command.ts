import type { SupabaseClient } from '@supabase/supabase-js';
import type { JSONContent } from '@tiptap/core';
import { nanoid } from 'nanoid';
import type { Prompt, TimeSlotInput } from '$lib/domain/types.js';
import { canPublish, canUnpublish, canRepublish } from '$lib/domain/prompt.js';
import { deriveGeneralArea, validateRegion } from '$lib/services/location.js';

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

	publish(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void>;

	addSlots(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void>;

	editSlot(slotId: string, authorId: string, updates: Partial<TimeSlotInput>): Promise<void>;

	removeSlot(slotId: string, authorId: string): Promise<void>;

	unpublish(promptId: string, authorId: string): Promise<void>;

	republish(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void>;

	deleteDraft(promptId: string, authorId: string): Promise<void>;
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

	async publish(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);
		if (!canPublish(prompt, slots)) {
			throw new Error('Cannot publish: prompt must be a draft with 1-3 valid time slots');
		}

		await this.validateAndInsertSlots(promptId, slots, prompt.region);

		const { error } = await this.supabase
			.from('prompts')
			.update({ state: 'published', published_at: new Date().toISOString() })
			.eq('id', promptId)
			.eq('author_id', authorId);

		if (error) throw new Error(`Failed to publish prompt: ${error.message}`);
	}

	async addSlots(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);
		if (prompt.state !== 'published') {
			throw new Error('Can only add slots to a published prompt');
		}

		// Check total future non-accepted slots won't exceed 3
		// (exclude expired slots — they're functionally dead)
		const { count } = await this.supabase
			.from('time_slots')
			.select('id', { count: 'exact', head: true })
			.eq('prompt_id', promptId)
			.eq('accepted', false)
			.gt('start_time', new Date().toISOString());

		if ((count ?? 0) + slots.length > 3) {
			throw new Error('Cannot exceed 3 available slots per prompt');
		}

		await this.validateAndInsertSlots(promptId, slots, prompt.region);
	}

	async editSlot(slotId: string, authorId: string, updates: Partial<TimeSlotInput>): Promise<void> {
		const slot = await this.getOwnSlot(slotId, authorId);
		if (slot.accepted) {
			throw new Error('Cannot edit an accepted slot');
		}

		const fields: Record<string, unknown> = {};
		if (updates.start_time !== undefined) fields.start_time = updates.start_time;
		if (updates.duration_minutes !== undefined) fields.duration_minutes = updates.duration_minutes;

		if (updates.location) {
			const prompt = await this.getOwnPrompt(slot.prompt_id, authorId);
			if (!validateRegion(updates.location, prompt.region)) {
				throw new Error('Location is outside the prompt region');
			}
			const area = await deriveGeneralArea(updates.location);
			fields.exact_location = updates.location;
			fields.general_area = area.generalArea;
			fields.general_area_lat = area.centroidLat;
			fields.general_area_lng = area.centroidLng;
		}

		const { error } = await this.supabase
			.from('time_slots')
			.update(fields)
			.eq('id', slotId);

		if (error) throw new Error(`Failed to edit slot: ${error.message}`);
	}

	async removeSlot(slotId: string, authorId: string): Promise<void> {
		const slot = await this.getOwnSlot(slotId, authorId);
		if (slot.accepted) {
			throw new Error('Cannot remove an accepted slot');
		}

		const { error } = await this.supabase
			.from('time_slots')
			.delete()
			.eq('id', slotId);

		if (error) throw new Error(`Failed to remove slot: ${error.message}`);
	}

	async unpublish(promptId: string, authorId: string): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);
		if (!canUnpublish(prompt)) {
			throw new Error('Can only unpublish a published prompt');
		}

		const { error } = await this.supabase
			.from('prompts')
			.update({ state: 'archived', archived_at: new Date().toISOString() })
			.eq('id', promptId)
			.eq('author_id', authorId);

		if (error) throw new Error(`Failed to unpublish prompt: ${error.message}`);
	}

	async republish(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);
		if (!canRepublish(prompt, slots)) {
			throw new Error('Cannot republish: prompt must be archived with 1-3 valid time slots');
		}

		await this.validateAndInsertSlots(promptId, slots, prompt.region);

		const { error } = await this.supabase
			.from('prompts')
			.update({
				state: 'published',
				published_at: new Date().toISOString(),
				archived_at: null
			})
			.eq('id', promptId)
			.eq('author_id', authorId);

		if (error) throw new Error(`Failed to republish prompt: ${error.message}`);
	}

	async deleteDraft(promptId: string, authorId: string): Promise<void> {
		const prompt = await this.getOwnPrompt(promptId, authorId);
		if (prompt.state !== 'draft') {
			throw new Error('Can only delete drafts');
		}

		const { error } = await this.supabase
			.from('prompts')
			.delete()
			.eq('id', promptId)
			.eq('author_id', authorId);

		if (error) throw new Error(`Failed to delete prompt: ${error.message}`);
	}

	// Private helpers

	private async getOwnPrompt(promptId: string, authorId: string): Promise<Prompt> {
		const { data, error } = await this.supabase
			.from('prompts')
			.select('*')
			.eq('id', promptId)
			.eq('author_id', authorId)
			.single();

		if (error || !data) throw new Error('Prompt not found or access denied');
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

		if (error || !data) throw new Error('Slot not found');

		// Check ownership via the joined prompt
		const prompt = (data as Record<string, unknown>).prompts as { author_id: string } | null;
		if (!prompt || prompt.author_id !== authorId) {
			throw new Error('Slot not found or access denied');
		}

		return { id: data.id, prompt_id: data.prompt_id, accepted: data.accepted };
	}

	private async validateAndInsertSlots(
		promptId: string,
		slots: TimeSlotInput[],
		region: string
	): Promise<void> {
		const rows = [];
		for (const slot of slots) {
			if (!validateRegion(slot.location, region)) {
				throw new Error(`Location "${slot.location.name}" is outside the ${region} region`);
			}

			const area = await deriveGeneralArea(slot.location);
			rows.push({
				prompt_id: promptId,
				start_time: slot.start_time,
				duration_minutes: slot.duration_minutes,
				exact_location: slot.location,
				general_area: area.generalArea,
				general_area_lat: area.centroidLat,
				general_area_lng: area.centroidLng
			});
		}

		const { error } = await this.supabase.from('time_slots').insert(rows);
		if (error) throw new Error(`Failed to create time slots: ${error.message}`);
	}
}
