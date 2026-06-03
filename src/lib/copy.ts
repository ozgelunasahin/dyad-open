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

/**
 * Format a list of usernames as an @-tagged, human-readable phrase:
 *   []                      → ''
 *   ['tom']                 → '@tom'
 *   ['tom','sophie']        → '@tom and @sophie'
 *   ['tom','sophie','kai']  → '@tom, @sophie and 1 other'
 * Used where a single meeting slot hosts a small group (multiple co-participants).
 */
function formatNameList(usernames: string[]): string {
	const tagged = usernames.map((u) => `@${u}`);
	if (tagged.length === 0) return '';
	if (tagged.length === 1) return tagged[0];
	if (tagged.length === 2) return `${tagged[0]} and ${tagged[1]}`;
	const others = tagged.length - 2;
	return `${tagged[0]}, ${tagged[1]} and ${others} ${others === 1 ? 'other' : 'others'}`;
}

export const copy = {
	// ── Common — shared across multiple pages ───────────────────────────
	common: {
		_routes: ['/discover', '/profile', '/conversations/[id]', '/meetings/[id]', '/feedback/[id]'],
		_description: 'Button labels, fallback text, and error messages used across the whole app.',
		untitled: 'Untitled',
		save: 'Save',
		send: 'Send',
		back: 'Back',
		cancel: 'Cancel',
		accept: 'Accept',
		accepting: 'Accepting...',
		loading: 'Loading...',
		clear: 'Clear',
		someone: 'someone',
		networkError: 'Network error. Please try again.',
		genericError: 'Something went wrong. Please try again.',
		submitFailed: 'Couldn\u2019t submit. Please try again.',
		sendFailed: 'Couldn\u2019t send. Please try again.',
		clearFilters: 'Clear filters',
	},

	// ── Status labels ──────────────────────────────────────────────────
	status: {
		_routes: ['/profile'],
		_description: 'Conversation state badges in the profile expanded list.',
		published: 'Published',
		draft: 'Draft',
		responded: 'Responded',
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
		title: 'dyad.',
		metaDescription: 'A network for face to face sensemaking, in Berlin.',
		ogSiteName: 'dyad',
		ogUrl: 'https://dyad.berlin',
		rotatingWords: ['writers', 'parents', 'artists', 'neighbours', 'strangers', 'night owls', 'commuters', 'berliners', 'listeners', 'you'],
		tagline: 'cultivating a culture of conversation',
		joinWaitlist: 'join waitlist',
		logIn: 'log in',
		privateBeta: 'private beta',
		conversationsStartingSoon: 'Conversations are starting soon.',
	},

	// ── Discover ───────────────────────────────────────────────────────
	discover: {
		_routes: ['/discover'],
		_description: 'Main feed with list/map toggle. Shows conversation cards with filters.',
		noConversations: 'No conversations available right now.',
		audienceTag: 'within the {name} corner',
		checkBackSoon: 'Check back soon, or start your own.',
		startConversation: 'Start a conversation',
		noMatchingFilters: 'No conversations match your filters.',
		search: 'Search',
		searchPlaceholder: 'Search',
		noResults: 'No conversations found.',
		searchSuggestions: ['strangers & connection', 'philosophy of everyday life', 'belonging in Berlin', 'silence & listening', 'living in Berlin'],
	},

	// ── Conversation detail ────────────────────────────────────────────
	conversation: {
		_routes: ['/conversations/[id]'],
		_description: 'Viewing a conversation: body, response form, invitation flow, author edit/archive actions.',
		responsePlaceholder: 'Share your thoughts...',
		slotsTeaser: (authorUsername: string) => `respond to @${authorUsername} to see the times they've suggested to meet`,
		inviteQuestion: (authorUsername: string) => `Would you like to meet @${authorUsername} in person?`,
		inviteNotePlaceholder: 'Add a note (optional)',
		sendInvitation: 'Send invitation',
		sending: 'Sending...',
		responseSent: 'response sent',
		invitationSent: (authorUsername: string) => `Invitation sent to @${authorUsername}`,
		waitingForResponse: 'Waiting for a response.',
		slotExpired: 'This time has passed',
		slotInvited: 'Invited',
		publishedBy: (username: string, date: string) => `on ${date}, @${username} wrote`,
		youWrote: (date: string) => `on ${date}, you wrote`,
		respondedBy: (username: string, date: string) => `on ${date}, @${username} wrote`,
		youResponded: (date: string) => `${date === 'just now' ? 'just now' : `on ${date}`}, you responded`,
		invitationPending: (authorUsername: string) => `You have invited @${authorUsername}, waiting for them to confirm.`,
		youMet: (username: string) => `You met @${username}`,
		// Group gathering: a slot hosting multiple co-participants ("You met @tom and @sophie").
		youMetMany: (usernames: string[]) => `You met ${formatNameList(usernames)}`,
		withdrawInvitation: 'Withdraw invitation',
		withdrawing: 'Withdrawing...',
		withdrawFailed: 'Couldn\u2019t withdraw. Please try again.',
		decline: 'Decline',
		declining: 'Declining...',
		declineMessagePlaceholder: 'Optional: a short message',
		declineFailed: 'Couldn\u2019t decline. Please try again.',
		declineNoteLabel: 'Their note',
		confirmed: 'Confirmed',
		youAreMeeting: (username: string) => `You are meeting @${username}`,
		viewMeeting: 'View meeting →',
		myOfferedTimes: 'Times you offered',
		myOfferedTimesBooked: 'booked',
		changeTimes: 'Change times',
		unpublish: 'Unpublish',
		unpublishConfirm: 'Take this off the feed and back to drafts? You can republish anytime.',
		failedToUnpublish: 'Failed to unpublish.',
		delete: 'Delete',
		deleteTitle: 'Delete conversation',
		deleteConfirm: 'This will permanently delete the conversation and all its data. This cannot be undone.',
		failedToDelete: 'Failed to delete.',
		meetingScheduled: 'Meeting scheduled',
		meetingCancelled: (username: string, date: string) => `@${username} cancelled this meeting on ${date}`,
		meetingCancelledByYou: (date: string) => `You cancelled this meeting on ${date}`,
		cancellationNoteLabel: 'Their note',
		reinviteHeading: (username: string) => `@${username} cancelled. You can invite them to a new time.`,
		// Conversation size / capacity (shown to responders near the times).
		sizeOneOnOne: 'one-on-one',
		sizeGroup: (others: number) => `small group · up to ${others} other${others === 1 ? '' : 's'}`,
		// Surfaced to the author when accepting a joiner fails because the slot
		// is at capacity (or the invitation is otherwise no longer acceptable).
		conversationFull: 'This conversation is full or no longer available.',
		// Surfaced to a responder at invite time when the chosen slot is already
		// at capacity (best-effort guard; accept-time enforcement is the source
		// of truth and a TOCTOU fill between invite and accept is fine).
		timeFull: 'This time is full.',
		// Low-resolution "+N others joining" marker on a slot (excludes the viewer).
		othersJoining: (n: number) => `+${n} other${n === 1 ? '' : 's'} joining`,
		slotFull: 'Full',
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
		saving: 'Saving...',
		saved: 'Saved',
		saveError: 'Error',
		continue: 'Continue',
		discard: 'Discard',
		// Action-bar buttons
		publishHeadline: 'Times you’re free to meet',
		publishAction: 'Publish…',
		discardTitle: 'Discard draft',
		discardConfirm: 'This will permanently delete this draft. This cannot be undone.',
		uploading: 'Uploading...',
		changeCover: 'Change cover',
		addCoverPhoto: 'Add a cover photo',
		coverRequired: 'Required. Click or drag an image.',
		coverInvalidType: 'Please upload a JPG, PNG, WebP, or GIF.',
		coverTooLarge: 'That image is too large. Max 5MB.',
		coverUploadFailed: 'Couldn’t upload that image. Please try again.',
		coverNetworkError: 'Couldn’t reach the server. Check your connection.',
		writingPlaceholder: 'you can start writing here',
		dayPickerHint: 'Pick up to three slots in the next 7 days.',
		privacyNote: 'We only show the address to those you agree to meet.',
		addTime: '+ add time',
		publishing: 'Publishing...',
		publishButton: 'Publish',
		removeTimeSlot: 'Remove time slot',
		closeDialog: 'Close',
		setPlaceForOneSlot: 'Set a place for the time slot to publish.',
		setPlaceForAtLeastOneSlot: 'Set a place for at least one time slot to publish.',
		audiencePostingTo: 'Posting to',
		audienceCommons: '{region} (everyone)',
		audienceCorner: 'Within the {name} corner',
		sizeLabel: 'Who you’d like to meet',
		sizeOneOnOne: 'One-on-one',
		sizeGroup: 'A small group',
		sizeMaxOthers: 'up to {n} others',
		sizeFewer: 'Fewer people',
		sizeMore: 'More people',
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
		// Group gathering: a slot hosting multiple co-participants
		// ("Meeting with @tom and @sophie"). The author of a small-group
		// conversation sees everyone confirmed on the slot here.
		meetingWithMany: (usernames: string[]) => `Meeting with ${formatNameList(usernames)}`,
		meetingCancelled: 'Meeting cancelled',
		meetingCancelledBy: (username: string) => `@${username} cancelled this meeting`,
		meetingCancelledByYou: 'You cancelled this meeting',
		feedbackDue: 'Feedback due',
		youStarted: 'You started',
		youRespondedTab: 'You responded',
		archivedTab: 'Archive',
		pendingTab: 'Pending',
		scheduledTab: 'Scheduled',
		pastTab: 'Past',
		nothingHereYet: 'Nothing here yet.',
		noPendingInvitations: 'No pending invitations.',
		noScheduledMeetings: 'No scheduled meetings.',
		noPastMeetings: 'No past meetings.',
		invitedBy: (username: string) => `Invited by @${username}`,
		searchPlaceholder: 'Search your conversations...',
		emptyResponded: 'No responses yet.',
		emptyRespondedCta: 'Find a conversation →',
		emptyArchived: 'Nothing archived yet.',
		// Card helper text — composed JS strings on conversation cards.
		responseCount: (n: number) => (n === 1 ? '1 response' : `${n} responses`),
		meetingCount: (n: number) => (n === 1 ? '1 meeting' : `${n} meetings`),
		editedRelative: (when: string) => `edited ${when}`,
		respondedRelative: (when: string) => `responded ${when}`,
		invitedWaiting: (authorUsername: string) => `invited — waiting for @${authorUsername}`,
		invitationDeclined: 'invitation declined',
		invitationExpired: 'invitation expired',
		// Attention-card sentence: "@marco cancelled this meeting on Fri, 20 Apr"
		cancellationAttention: (username: string, date: string) =>
			`@${username} cancelled this meeting on ${date}`,
	},

	// ── Meeting detail ─────────────────────────────────────────────────
	meeting: {
		_routes: ['/meetings/[id]'],
		_description: 'Single meeting view with time/location details, linked conversation, and cancel action.',
		addToCalendar: 'Add to calendar',
		cancelMeeting: 'Cancel meeting',
		cancelling: 'Cancelling...',
		cancelConfirm: 'Are you sure you want to cancel this meeting?',
		cancelTitle: (username: string) => `Cancel your meeting with @${username}?`,
		cancelBodyEarly: (username: string) =>
			`You're cancelling more than 12 hours out, so the slot goes back to discover. @${username} will see your note on the conversation.`,
		cancelBodyLate: (username: string) =>
			`This is a late cancellation — @${username} won't have much time to make other plans. A real explanation matters here.`,
		cancelReasonLabelEarly: (username: string) => `A message to @${username}`,
		cancelReasonLabelLate: (username: string) => `Tell @${username} what happened`,
		cancelReasonPlaceholderEarly: 'A sentence or two.',
		cancelReasonPlaceholderLate: 'Be honest — it helps.',
		cancelGenericError: 'Couldn\'t cancel the meeting. Please try again.',
		cancelKeep: 'Keep meeting',
		cancelConfirmEarly: 'Cancel meeting',
		cancelConfirmLate: 'Cancel anyway',
		cancelConfirmLateNoNote: 'Cancel without explanation',
		when: 'When',
		duration: 'Duration',
		area: 'Area',
		location: 'Location',
		invitationNote: 'Invitation note',
		minutes: 'minutes',
		// Feedback-status block on the meeting detail page.
		feedbackDue: 'You have feedback to submit',
		giveFeedback: 'Give feedback',
		feedbackWaitingForOther: 'Feedback submitted — waiting for the other person',
		revealedTitle: 'What they shared with you',
		revealedNoShow: 'They reported you didn\u2019t meet',
		// .ics calendar event metadata
		calendarTitlePrefix: 'dyad: ',
		calendarFallbackTitle: (username: string) => `Meeting with @${username}`,
		// Interim safety floor: a gathering participant flags a problem to moderators.
		reportProblem: 'Report a problem',
		reportTitle: 'Report a problem',
		reportBody: 'If something felt unsafe or off about this gathering, tell us. A moderator will read it.',
		reportLabel: 'What happened?',
		reportPlaceholder: 'A few sentences. Be honest — it helps us look into it.',
		reportSubmit: 'Send report',
		reportSubmitting: 'Sending...',
		reportCancel: 'Cancel',
		reportThankYou: 'Thanks — a moderator will look into this.',
		reportGenericError: 'Couldn’t send the report. Please try again.',
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
		revealIntro: (username: string) => `Here's what @${username} shared with you:`,
		revealIntroFallback: "Here's what they shared with you:",
	},

	// ── Group feedback ───────────────────────────────────────────────────
	groupFeedback: {
		_routes: ['/feedback/group/[id]'],
		_description: 'Post-gathering feedback for group conversations. One simple form per participant per gathering. Gated — blocks all app access until submitted.',
		title: 'How was the conversation?',
		meetAgainQuestion: 'Would you have a conversation with these people again?',
		yes: 'Yes',
		no: 'No',
		commentLabel: 'Anything you want to add?',
		commentPlaceholder: 'Optional',
		personalFeedbackLabel: 'Any personal feedback you\'d like to give?',
		personalFeedbackPlaceholder: 'Optional',
		submit: 'Submit feedback',
		submitting: 'Submitting...',
		thankYou: 'Thank you',
		submitted: 'Your feedback has been submitted.',
		continueToDiscover: 'Continue to discover',
	},

	// ── Waitlist ───────────────────────────────────────────────────────
	waitlist: {
		_routes: ['/waitlist', '/ (AuthDialog)'],
		_description: 'Public waitlist request page and AuthDialog modal.',
		thankYou: 'Thank you. We\'ll be in touch.',
		alreadyOnWaitlist: 'You\'re already on our list. We\'ll be in touch soon.',
		thanksForJoining: 'Thanks for joining. We\'ll be in touch within a week.',
		joinWaitlist: 'Join the waitlist',
		joinWaitlistButton: 'Join waitlist',
		sendingWaitlist: 'Sending...',
		whatsOnYourMind: 'Dyad is a curated network of people who see conversation as one of the limited spaces left that celebrates our differences as an asset. Why do you want more or other conversations in your life?',
		thoughtPlaceholder: 'We wonder',
		city: 'City',
		selectCity: 'Select your city',
		activeNow: 'Active now',
		comingSoon: 'Coming soon',
		cityExpansionNote: 'We\'re currently active in Berlin and will expand to other cities soon.',

		// /waitlist page
		pageTitle: 'join - dyad. cultivating a culture of conversation',
		heading: 'Request to join',
		subtitle: 'For those who seek conversation for its own sake and meet others with humility, critical thinking and deep listening.',
		successMessage: "Thank you. We'll be in touch.",
		freewriteLabel: 'Why do you want to join?',
		freewritePlaceholder: "What's in a conversation?",
		namePlaceholder: 'Name',
		emailPlaceholder: 'Email',
		sending: 'Sending...',
		submitCta: 'Request to join',
		freewriteRequired: 'Please share your thoughts before joining.',
		genericError: 'Something went wrong',
	},

	// ── Auth ───────────────────────────────────────────────────────────
	auth: {
		_routes: ['/login', '/join', '/signup', '/ (AuthDialog)'],
		_description: 'Login page, signup/OTP page, invitation-based join page, and AuthDialog (modal on landing page).',
		welcomeBack: 'Welcome back',
		signInSubtitle: 'Sign in to create and join conversations',
		signIn: 'Sign in',
		loggingIn: 'Logging in...',
		forgotPassword: 'Forgot password?',
		passwordHint: 'At least 8 characters',
		email: 'Email',
		password: 'Password',
		name: 'Name',
		alreadyHaveAccount: 'Already have an account?',
		dontHaveAccount: "Don't have an account?",
		join: 'Join',
		logIn: 'Log in',
		somethingWentWrong: 'Something went wrong. Please try again.',

		// Login page — reset / update-password sub-modes
		resetPasswordTitle: 'Reset password',
		setNewPasswordTitle: 'Set new password',
		resetSubtitle: 'Enter your email to receive a reset link',
		updateSubtitle: 'Choose a new password for your account',
		signingIn: 'Signing in...',
		sending: 'Sending...',
		updating: 'Updating...',
		sendResetLink: 'Send reset link',
		updatePasswordAction: 'Update password',
		goToDashboard: 'Go to dashboard',
		newPasswordLabel: 'New password',
		passwordPlaceholder: 'Password',
		emailPlaceholder: 'Email',

		// <title> variants for the login page
		pageTitleLogin: 'login - dyad. cultivating a culture of conversation',
		pageTitleReset: 'reset password - dyad. cultivating a culture of conversation',
		pageTitleUpdate: 'set new password - dyad. cultivating a culture of conversation',

		// Signup / OTP page
		signupPageTitle: 'Join dyad.',
		checkYourEmail: 'Check your email',
		otpIntro: 'We sent a 6-digit code to',
		verifying: 'Verifying...',
		confirm: 'Confirm',
		wrongEmail: 'Wrong email?',
		startOver: 'Start over',
		youreInvited: "You're invited",
		createAccountSubtitle: 'Create your account to join the conversation.',
		usernamePlaceholder: 'Username',
		usernameTitle: 'Lowercase letters, numbers, underscores, and hyphens only',
		usernameHintShort: 'Your public URL: dyad.berlin/',
		usernameHintLong: 'This will be your public URL: dyad.berlin/',
		passwordWithMinPlaceholder: 'Password (at least 8 characters)',
		berlinBased: "I'm based in Berlin",
		creatingAccount: 'Creating account...',
		createAccount: 'Create account',

		// Invitation-based join page
		joinPageTitle: 'Join dyad. - cultivating a culture of conversation',
		welcomeToDyad: 'Welcome to dyad.',
		invitationExpired: 'Invitation expired',
		invitationExpiredSubtitle: 'This invitation link is no longer valid. It may have expired or already been used.',
		backToHome: 'Back to home',
	},

	// ── Admin ──────────────────────────────────────────────────────────
	admin: {
		_routes: ['/admin/*'],
		_description: 'Admin panel navigation and labels.',
		waitlist: 'Waitlist',
		invites: 'Invites',
		members: 'Members',
		scopes: 'Scopes',
		feedback: 'Feedback',
		conversations: 'Conversations',
		settings: 'Settings',
		hide: 'Hide',
		unhide: 'Unhide',
		hidden: 'Hidden',
		hideError: 'Could not update visibility. Try again.',
	},

	// ── App feedback ───────────────────────────────────────────────────
	appFeedback: {
		_routes: ['/discover', '/profile', '/conversations/*', '/meetings/*', '/admin/*'],
		_description: 'Corner "?" button that opens a feedback dialog. Present on all authenticated pages.',
		sendFeedback: 'Send feedback',
		placeholderBug: 'what happened (and what should have happened)',
		placeholderFeature: 'what is something you would like to see here',
		placeholderReport: 'what content are you reporting, and why',
		placeholderOther: 'something to share with the developers',
		thankYou: 'Thanks for your feedback!',
		minLength: 'Please write at least 10 characters',
		typeBug: 'Bug',
		typeFeature: 'Feature',
		typeReport: 'Report',
		typeOther: 'Other',
	},

	// ── Emails ─────────────────────────────────────────────────────────
	email: {
		_routes: ['/api/contact', '/api/invites'],
		_description: 'Transactional emails sent server-side. HTML templates in the API route handlers.',
		inviteSubject: 'Come & join us at Dyad.',
		inviteBody: (displayName: string, inviteUrl: string, expiryDays: number) =>
			`Hi ${displayName}, We are letting in groups of people to come and play. We are currently on our private beta and would love for you to take a walk inside and tell us about your experience. You can do this asynchronously via the feedback area on the bottom right with a question mark icon. We are looking forward to bringing the fruits of our love, care and labor to you. Join: ${inviteUrl}. This link expires in ${expiryDays} days.`,
		waitlistSubject: "What's in a conversation?",
		tagline: 'cultivating a culture of conversation',
		// Rendered into the transactional email footers. Three lines:
		// the closing supports the names; the names anchor the message;
		// the brand foots, set small and quiet.
		signature: {
			closing: 'With care and joy,',
			names: 'Luna and Fiore',
			brand: 'dyad · berlin',
		},
	},
} as const;
