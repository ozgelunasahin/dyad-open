import type { SupabaseClient } from '@supabase/supabase-js';
import {
	SupabasePromptCommandService,
	type PromptCommandService
} from '../../src/lib/services/prompt-command.js';
import {
	SupabasePromptQueryService,
	type PromptQueryService
} from '../../src/lib/services/prompt-query.js';
import {
	SupabaseCommentService,
	type CommentService
} from '../../src/lib/services/comment.js';
import {
	SupabaseInvitationService,
	type InvitationService
} from '../../src/lib/services/invitation.js';
import {
	SupabaseMeetingService,
	type MeetingService
} from '../../src/lib/services/meeting.js';

export interface Services {
	promptCommand: PromptCommandService;
	promptQuery: PromptQueryService;
	comment: CommentService;
	invitation: InvitationService;
	meeting: MeetingService;
}

/**
 * Create service instances from a Supabase client.
 * Tests interact with the service interfaces, not the Supabase client directly.
 * When we swap implementations, only this factory changes.
 */
export function createServices(supabase: SupabaseClient): Services {
	return {
		promptCommand: new SupabasePromptCommandService(supabase),
		promptQuery: new SupabasePromptQueryService(supabase),
		comment: new SupabaseCommentService(supabase),
		invitation: new SupabaseInvitationService(supabase),
		meeting: new SupabaseMeetingService(supabase)
	};
}
