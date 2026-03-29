/**
 * Centralized user-facing copy.
 *
 * All user-facing strings live here so that changing wording means
 * editing one file — no component code changes needed.
 *
 * Each section has:
 * - `_routes`: machine-readable array of routes where strings appear (for testing)
 * - `_description`: human-readable context for whoever is editing copy
 *
 * Usage: import { copy } from '$lib/copy';
 *        <p>{copy.conversation.responsePlaceholder}</p>
 */

export const copy = {
	// ── Common — shared across multiple pages ───────────────────────────
	common: {
		_routes: ['/discover', '/profile', '/conversations/[id]', '/meetings/[id]', '/feedback/[id]'],
		_description: 'Button labels, fallback text, and error messages used across the whole app.',
		untitled: 'Untitled',
		send: 'Send',
		back: 'Back',
		accept: 'Accept',
		accepting: 'Accepting...',
		loading: 'Loading...',
		networkError: 'Network error',
		clearFilters: 'Clear filters',
	},

	// ── Status labels ──────────────────────────────────────────────────
	status: {
		_routes: ['/profile'],
		_description: 'Conversation state badges in the profile expanded list.',
		published: 'Published',
		draft: 'Draft',
		responded: 'Responded',
		archived: 'Archived',
		past: 'Past',
	},

	// ── Navigation ──────────────────────────────────────────────────────
	nav: {
		_routes: ['/discover', '/profile', '/conversations/[id]/edit', '/admin/*'],
		_description: 'FloatingNav labels and profile page sign-out.',
		discover: 'Discover',
		profile: 'Profile',
		admin: 'Admin',
		signOut: 'sign out',
		startConversation: 'start a conversation',
	},

	// ── Landing page ───────────────────────────────────────────────────
	landing: {
		_routes: ['/'],
		_description: 'Landing page for unauthenticated visitors.',
		rotatingWords: ['writers', 'parents', 'insomniacs', 'neighbours', 'strangers', 'night owls', 'commuters', 'cooks', 'berliners', 'listeners', 'daydreamers', 'you'],
		tagline: 'cultivating a culture of conversation',
		joinWaitlist: 'join waitlist',
		logIn: 'log in',
		privateBeta: 'private beta',
	},

	// ── Discover ───────────────────────────────────────────────────────
	discover: {
		_routes: ['/discover'],
		_description: 'Main feed with list/map toggle. Shows conversation cards with filters.',
		noConversations: 'No conversations available right now.',
		checkBackSoon: 'Check back soon, or start your own.',
		startConversation: 'Start a conversation',
		noMatchingFilters: 'No conversations match your filters.',
	},

	// ── Conversation detail ────────────────────────────────────────────
	conversation: {
		_routes: ['/conversations/[id]'],
		_description: 'Viewing a conversation: body, response form, invitation flow, author edit/archive actions.',
		responsePlaceholder: 'Write a response...',
		responsePlaceholderWithSlots: 'Respond to unlock invitation...',
		inviteQuestion: (authorUsername: string) => `Would you like to meet @${authorUsername} in person?`,
		inviteNotePlaceholder: 'Add a note (optional)',
		sendInvitation: 'Send invitation',
		sending: 'Sending...',
		invitationSent: (authorUsername: string) => `Invitation sent to @${authorUsername}`,
		waitingForResponse: 'Waiting for a response.',
		slotExpired: 'This time has passed',
		slotInvited: 'Invited',
		publishedBy: (username: string, date: string) => `on ${date}, @${username} wrote`,
		youResponded: (date: string) => `${date === 'just now' ? 'just now' : `on ${date}`}, you responded`,
		invitationPending: (authorUsername: string) => `You have invited @${authorUsername}, waiting for them to confirm.`,
		confirmed: 'Confirmed',
		youAreMeeting: (username: string) => `You are meeting @${username}`,
		viewMeeting: 'View meeting →',
		edit: 'Edit',
		archive: 'Archive',
		archiveConfirm: 'Archiving will expire pending invitations. Continue?',
		meetingScheduled: 'Meeting scheduled',
	},

	// ── Editor ─────────────────────────────────────────────────────────
	editor: {
		_routes: ['/conversations/[id]/edit'],
		_description: 'Creating and editing conversations with TipTap rich text editor.',
		titlePlaceholder: 'Title',
		bodyPlaceholder: 'Start writing your conversation...',
		saveDraft: 'Save as draft',
		publish: 'Publish as conversation',
		loadingEditor: 'Loading editor...',
		failedToLoad: 'Failed to load editor.',
		published: 'Published',
		publishedDesc: 'Your conversation is live on the discover feed.',
		unpublish: 'Unpublish',
	},

	// ── Profile ────────────────────────────────────────────────────────
	profile: {
		_routes: ['/profile'],
		_description: 'User profile with unified conversation list (inline meeting context) and attention section for pending invitations, feedback, and cancellations.',
		conversations: 'Conversations',
		meetings: 'Meetings',
		needsAttention: 'Needs your attention',
		noConversations: 'No conversations yet.',
		noMeetings: 'No meetings yet.',
		startOne: 'Start one',
		startConversation: 'Start your first conversation',
		continueEditing: 'continue editing →',
		respondedTo: (username: string) => `you responded to @${username}`,
		seeAll: (count: number) => `See all ${count} conversations →`,
		viewConversation: 'View conversation',
		wantsToMeet: (username: string) => `@${username} wants to meet`,
		meetingWith: (username: string) => `Meeting with @${username}`,
		meetingCancelled: 'Meeting cancelled',
		meetingCancelledBy: (username: string) => `@${username} cancelled your meeting`,
		feedbackDue: 'Feedback due',
	},

	// ── Meeting detail ─────────────────────────────────────────────────
	meeting: {
		_routes: ['/meetings/[id]'],
		_description: 'Single meeting view with time/location details, linked conversation, and cancel action.',
		addToCalendar: 'Add to calendar',
		cancelMeeting: 'Cancel meeting',
		cancelling: 'Cancelling...',
		cancelConfirm: 'Are you sure you want to cancel this meeting?',
		duration: 'Duration',
		area: 'Area',
		location: 'Location',
		invitationNote: 'Invitation note',
		minutes: 'minutes',
	},

	// ── Feedback ───────────────────────────────────────────────────────
	feedback: {
		_routes: ['/feedback/[id]'],
		_description: 'Post-meeting feedback form. Gated — blocks all app access until submitted.',
		howDidItGo: 'How did it go?',
		weMet: 'We met',
		weDidntMeet: "We didn't meet",
		thankYou: 'Thank you',
		submitted: 'Your feedback has been submitted.',
		continueToDiscover: 'Continue to discover',
		whatHappened: 'What happened?',
		selectTags: 'Select any that apply:',
		shareWithPerson: 'What would you like to share with them?',
		shareWithPersonHint: 'This will be shared with them after they also submit feedback',
		shareWithPlatform: 'Anything you want to share with us?',
		submitFeedback: 'Submit feedback',
		submitting: 'Submitting...',
	},

	// ── Waitlist ───────────────────────────────────────────────────────
	waitlist: {
		_routes: ['/waitlist'],
		_description: 'Waitlist signup form for unauthenticated visitors.',
		thankYou: 'Thank you. We\'ll be in touch.',
		alreadyOnWaitlist: 'You\'re already on the waitlist — we\'ll be in touch soon.',
	},

	// ── Auth ───────────────────────────────────────────────────────────
	auth: {
		_routes: ['/login', '/join'],
		_description: 'Login page (email/password) and join page (invite-based signup).',
		welcomeBack: 'Welcome back',
		signInSubtitle: 'Sign in to create and join conversations',
		signIn: 'Sign in',
		forgotPassword: 'Forgot password?',
		passwordHint: 'At least 8 characters',
	},

	// ── App feedback ───────────────────────────────────────────────────
	appFeedback: {
		_routes: ['/discover', '/profile', '/conversations/*', '/meetings/*', '/admin/*'],
		_description: 'Corner "?" button that opens a feedback dialog. Present on all authenticated pages.',
		sendFeedback: 'Send feedback',
		placeholder: 'What happened? What did you expect?',
		thankYou: 'Thanks for your feedback!',
		minLength: 'Please write at least 10 characters',
		typeBug: 'Bug',
		typeFeature: 'Feature',
		typeOther: 'Other',
	},

	// ── Emails ─────────────────────────────────────────────────────────
	email: {
		_routes: ['/api/contact', '/api/invites'],
		_description: 'Transactional emails sent server-side. HTML templates in the API route handlers.',
		inviteSubject: 'Welcome to dyad.',
		inviteBody: (displayName: string, inviteUrl: string, expiryDays: number) =>
			`Hi ${displayName}, You've been invited to join dyad — a community of people in Berlin who meet for real conversations. Join: ${inviteUrl}. This link expires in ${expiryDays} days.`,
		waitlistSubject: "What's in a conversation?",
		tagline: 'cultivating a culture of conversation',
	},
} as const;
