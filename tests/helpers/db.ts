import type { SupabaseClient } from '@supabase/supabase-js';
import {
	SupabasePromptCommandService,
	type PromptCommandService
} from '../../src/lib/services/prompt-command.js';
import {
	SupabasePromptQueryService,
	type PromptQueryService
} from '../../src/lib/services/prompt-query.js';

export interface Services {
	promptCommand: PromptCommandService;
	promptQuery: PromptQueryService;
}

/**
 * Create service instances from a Supabase client.
 * Tests interact with the service interfaces, not the Supabase client directly.
 * When we swap implementations, only this factory changes.
 */
export function createServices(supabase: SupabaseClient): Services {
	return {
		promptCommand: new SupabasePromptCommandService(supabase),
		promptQuery: new SupabasePromptQueryService(supabase)
	};
}
