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
		// Brand suffix for every page title, as `<page> · <suffix>`. Public pages
		// had drifted across three variants — 'dyad.', 'dyad.social', and
		// 'dyad. cultivating a culture of conversation' — which reads as three
		// sites in a search results page. src/routes/page-titles.test.ts pins the
		// single value; the search-result title is the page name, not the brand,
		// so the shortest form wins.
		titleSuffix: 'dyad.',
		untitled: 'Untitled',
		// The viewer’s own pin in a participants stack — never their raw @handle.
		you: 'you',
		// Hover handle on the anonymised pins — how many, never who.
		nOthers: (n: number) => `${n} other${n === 1 ? '' : 's'}`,
		// Screen-reader labels for a participants stack.
		roomWithYou: (others: number) => `you and ${others} other${others === 1 ? '' : 's'} joining`,
		roomSize: (n: number) => `${n} joining`,
		moreJoining: (n: number) => `${n} more joining`,
		// Tail of a linkified name list ("@a, @b and 2 others") — the names are
		// rendered as UserHandle links, so the string is decomposed into parts.
		andNOthers: (n: number) => `and ${n} other${n === 1 ? '' : 's'}`,
		// Accessible name for the stretched overlay link on a gathering card.
		openMeeting: 'Open meeting',
		save: 'Save',
		send: 'Send',
		back: 'Back',
		cancel: 'Cancel',
		close: 'Close',
		notNow: 'not now — keep looking around',
		accept: 'Accept',
		accepting: 'Accepting…',
		loading: 'Loading…',
		clear: 'Clear',
		someone: 'someone',
		// Round calendar button on the day rails (publish sheet + discover When
		// filter) and the calendar picker modal it opens.
		pickDaysAhead: 'pick days further ahead',
		monthAheadTitle: 'Further ahead',
		done: 'done',
		networkError: 'Network error. Please try again.',
		genericError: 'Something went wrong. Please try again.',
		submitFailed: 'Couldn’t submit. Please try again.',
		sendFailed: 'Couldn’t send. Please try again.',
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

	// ── Onboarding ─────────────────────────────────────────────────────
	onboarding: {
		_routes: ['/discover'],
		_description:
			'The 4-step welcome modal shown once on the discover page. Voice: the founders speaking plainly about what dyad is, who builds it, and how the member shapes it.',
		welcomeHeading: (username: string) => `Hey${username ? ` ${username}` : ''}, welcome in.`,
		welcomeBody: [
			'This is a place on the web to find people to talk to, in person.',
			'We don’t believe the internet replaces conversation. We use it to begin one.',
			'A small team builds dyad, voluntarily so far, because we care about how people meet: chosen, unhurried, face to face, on your own terms.'
		],
		welcomeCta: 'How does it work?',

		howHeading: 'Discover.',
		howIntro:
			'Discover is where the conversations people in your city want to have live. Explore them in map or list view.',
		howCreateHeading: 'Create a conversation',
		howCreateCaption:
			'Something’s been on your mind. Write it down. There’s someone else thinking about it too.',
		howOr: 'or',
		howJoinHeading: 'Join one',
		howJoinCaption:
			'Read it, respond with your perspective. Responding first is how joining begins — the invitation follows.',
		howCta: 'Got it',

		offlineHeading: 'Meet, in person.',
		offlineBody: [
			'Once an invitation is confirmed, you receive the details you need — where, when, and who.',
			'Plans change; you can cancel up to 12 hours before the meeting.'
		],
		offlineCta: 'Got it',

		yoursHeading: 'Thank you for being part of the journey at its early, bumpy stage.',
		yoursBody: [
			'dyad is co-designed with the people in it — you shape the rules, the program and the culture with us, and take part in decision-making in the Assembly.',
			'If it resonates, consider supporting us as a member. It keeps dyad independent and ad-free.',
			'Welcome in.'
		],
		yoursCtaMember: 'Become a member',
		yoursCtaExplore: 'Explore',
		skip: 'Skip'
	},

	// ── Search-result descriptions ─────────────────────────────────────
	// Shown under the title in a search result. Say only what the page answers,
	// and vary the sentence shape between them — a set of identically-shaped
	// lines reads as a template rather than a description.
	// src/routes/page-titles.test.ts requires one per public page, all distinct.
	seo: {
		_routes: ['/impressum', '/datenschutz', '/agb', '/legal', '/waitlist'],
		_description: 'Meta descriptions for public pages, shown in search results.',
		impressum: 'Who runs dyad and how to reach them.',
		datenschutz: 'What dyad does with your personal data and how to see, correct or delete it.',
		agb: 'The terms of use for dyad membership and the zine.',
		legal: "Switch between dyad's Impressum, terms of use and privacy policy.",
		waitlist:
			'Request to join dyad, the offline social network owned by its community. Every request is reviewed.'
	},

	// ── Landing page ───────────────────────────────────────────────────
	landing: {
		_routes: ['/'],
		_description: 'Landing page for unauthenticated visitors.',
		title: 'dyad.',
		metaDescription: 'The offline social network owned by its community.',
		ogSiteName: 'dyad',
		ogUrl: 'https://dyad.social',
		joinWaitlist: 'Join',
		logIn: 'Sign in',
		// Footer links (left column). The legal-notice link is labelled
		// "Impressum" — the page at /impressum is a legal notice, not terms
		// of service, and German visitors look for it by that name.
		footerDocs: 'Documentation',
		footerCommunity: 'Wiggling',
		footerNewsletter: 'Newsletter',
		footerLegal: 'Legal',
		// ── Hero ────────────────────────────────────────────────────────
		// One sentence, carrying the whole claim on its own. There is no
		// progressive disclosure behind it — what a reader sees is all there
		// is, so the sentence has to be complete rather than a teaser.
		//
		// "Online, offline" makes dyad a movement rather than a place, which
		// is both the honest description and the one thing nobody else in the
		// category can say — everyone else wants you to stay. It is already
		// literally true: a conversation starts in writing here (a prompt, a
		// response) and becomes face to face. When posts and bookmarks can be
		// imported, the same sentence covers that too, so the copy grows into
		// the roadmap without ever having overclaimed.
		//
		// No ownership claim in the headline. Ownership language lives in
		// whoLead below, future-framed, for the reason "Collectively owned"
		// was dropped as a present claim on 2026-07-20 — dyad is not
		// collectively owned yet. The archived ownership page is at
		// src/lib/archive/StewardOwnershipPage.svelte.
		headline: 'Turn your conversations online, offline.',
		// The paragraph beneath the headline: what dyad is, in one line, for
		// a reader who has just met the headline and needs the noun.
		// "Third space" is the load-bearing term — the established one for a
		// place that is neither home nor work, so it does real work without
		// needing a gloss.
		sublineLead: 'Dyad is a third space for initiating and finding face to face conversations about what matters to you.',
		// Who we are, in first person, positioned inside the 2020s
		// counterculture rather than described from outside it. The first
		// sentence names a refusal ("we resist …") rather than an
		// observation, so the second has something to act on.
		//
		// The three practices are ordered by how checkable they are today.
		// The writing culture is the strongest of them: open source is table
		// stakes in this field, the ownership transition is a promise about
		// the future, but legible decisions can be verified now. "Transition
		// to" keeps the tense honest, the same reason "Collectively owned" was
		// dropped as a present claim on 2026-07-20.
		// "Prefigurative" is the term of art for building the world you want in
		// the means you use to get there. It is also the framing the Unfolding
		// pieces already use, so the landing page and the newsletter name the
		// same practice.
		whoLead:
			'Rooted in our time’s decentralised, internet-native counterculture, we resist digital saturation, corporate capture, and the institutional norms that sustain both. We take a prefigurative approach to building social technology through open-source software, a writing culture that keeps decisions legible, and our transition to collective ownership and governance.',
		sublineFor:
			'For people who want less screen time and more contact with the world and one another.',
		wordmark: 'DYAD',
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
		searchPlaceholder: 'Search',
		noResults: 'No conversations found.',
		searchSuggestions: ['strangers & connection', 'philosophy of everyday life', 'belonging in Berlin', 'silence & listening', 'living in Berlin'],
		// Desktop preview card over the map (pin or list-card click).
		// The card's content block is the link into the conversation; this
		// labels it for assistive tech.
		previewOpenLabel: (title: string) => `Open "${title}"`,
		previewMoreTimes: (n: number) => `${n} more time${n === 1 ? '' : 's'}`,
		filterWhenLabel: 'When',
		filterWhereLabel: 'Where',
		filterAnywhere: 'Anywhere',
		filterTypeLabel: 'Type',
		filterCornerLabel: 'Corner',
		filterOneOnOne: '1-on-1',
		filterGroup: 'Group',
		filterClearAll: 'clear all',
	},

	// ── Conversation detail ────────────────────────────────────────────
	conversation: {
		_routes: ['/conversations/[id]'],
		_description: 'Viewing a conversation: body, response form, invitation flow, author edit/archive actions.',
		responsePlaceholder: 'Share your thoughts…',
		// Referral share — copies this conversation's URL with ?ref=<username>.
		shareLink: 'share with a friend',
		shareCopied: 'link copied',
		slotsTeaser: (authorUsername: string) => `respond to @${authorUsername} to see the times they’ve suggested to meet`,
		inviteQuestion: (authorUsername: string) => `Would you like to meet @${authorUsername} in person?`,
		inviteNotePlaceholder: 'Add a note (optional)',
		sendInvitation: 'Send invitation',
		sending: 'Sending…',
		responseSent: 'response sent',
		youWrote: (date: string) => `on ${date}, you wrote`,
		respondedBy: (username: string, date: string) => `on ${date}, @${username} wrote`,
		// Decomposed variant for linkified rendering: prefix + <UserHandle> + suffix.
		respondedByPrefix: (date: string) => `on ${date},`,
		wroteSuffix: 'wrote',
		youResponded: (date: string) => `${date === 'just now' ? 'just now' : `on ${date}`}, you responded`,
		invitationPending: (authorUsername: string) => `You have invited @${authorUsername}, waiting for them to confirm.`,
		withdrawInvitation: 'Withdraw invitation',
		withdrawConfirm: 'Take back your invitation? You can invite again while the time is still offered.',
		withdrawing: 'Withdrawing…',
		withdrawFailed: 'Couldn’t withdraw. Please try again.',
		decline: 'Decline',
		declining: 'Declining…',
		declineMessagePlaceholder: 'Optional: a short message',
		declineFailed: 'Couldn’t decline. Please try again.',
		myOfferedTimes: 'Times you offered',
		changeTimes: 'Change times',
		unpublish: 'Unpublish',
		unpublishConfirm: 'Take this off the feed and back to drafts? You can republish anytime.',
		failedToUnpublish: 'Failed to unpublish.',
		delete: 'Delete',
		deleteTitle: 'Delete conversation',
		deleteConfirm: 'This will permanently delete the conversation and all its data. This cannot be undone.',
		failedToDelete: 'Failed to delete.',
		// Conversation size / capacity (shown to responders near the times).
		sizeOneOnOne: 'one-on-one',
		sizeGroup: (others: number) => `small group · up to ${others} other${others === 1 ? '' : 's'}`,
		// Author’s response-spine view: each response carries a quiet status line,
		// referencing its slot by day + neighbourhood only (the exact place lives
		// once in "Times you offered"). slotRef is pre-formatted "day · neighbourhood".
		responsesHeading: 'Responses',
		statusConfirmed: (slotRef: string | null) => (slotRef ? `confirmed · ${slotRef}` : 'confirmed'),
		statusMet: (slotRef: string | null) => (slotRef ? `met · ${slotRef}` : 'met'),
		statusWantsToMeet: (slotRef: string | null) => (slotRef ? `wants to meet · ${slotRef}` : 'wants to meet'),
		participantCancelled: 'cancelled',
		// Surfaced to the author when accepting a joiner fails because the slot
		// is at capacity (or the invitation is otherwise no longer acceptable).
		conversationFull: 'This conversation is full or no longer available.',
		// Surfaced to a responder at invite time when the chosen slot is already
		// at capacity (best-effort guard; accept-time enforcement is the source
		// of truth and a TOCTOU fill between invite and accept is fine).
		timeFull: 'This time is full.',
		timeNoLongerOffered: 'This time is no longer offered.',
		// Low-resolution "+N others joining" marker on a slot (excludes the viewer).
		othersJoining: (n: number) => `+${n} other${n === 1 ? '' : 's'} joining`,
		slotFull: 'Full',
	},

	// ── Editor ─────────────────────────────────────────────────────────
	editor: {
		_routes: ['/conversations/[id]/edit'],
		_description: 'Creating and editing conversations with TipTap rich text editor.',
		titlePlaceholder: 'Title',
		bodyPlaceholder: 'Start writing your conversation…',
		saveDraft: 'Save as draft',
		publish: 'Publish as conversation',
		loadingEditor: 'Loading editor…',
		failedToLoad: 'Failed to load editor.',
		published: 'Published',
		publishedDesc: 'Your conversation is live on the discover feed.',
		saving: 'Saving…',
		saved: 'Saved',
		saveError: 'Error',
		continue: 'Continue',
		discard: 'Discard',
		// Action-bar buttons
		publishHeadline: 'Times you’re free to meet',
		publishAction: 'Publish…',
		discardTitle: 'Discard draft',
		discardConfirm: 'This will permanently delete this draft. This cannot be undone.',
		uploading: 'Uploading…',
		changeCover: 'Change cover',
		addCoverPhoto: 'Add a cover photo',
		coverRequired: 'Required. Click or drag an image.',
		coverInvalidType: 'Please upload a JPG, PNG, WebP, or GIF.',
		coverTooLarge: 'That image is too large. Max 5MB.',
		coverUploadFailed: 'Couldn’t upload that image. Please try again.',
		coverNetworkError: 'Couldn’t reach the server. Check your connection.',
		writingPlaceholder: 'you can start writing here',
		dayPickerHint: 'Pick up to three slots in the month ahead.',
		privacyNote: 'We only show the address to those you agree to meet.',
		addTime: '+ add time',
		publishing: 'Publishing…',
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
		// Decomposed parts for linkified rendering: 'Meeting with' + <UserHandle>
		// links, and <UserHandle> + 'cancelled this meeting'.
		meetingWithPrefix: 'Meeting with',
		cancelledThisMeetingSuffix: 'cancelled this meeting',
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
		searchPlaceholder: 'Search your conversations…',
		emptyResponded: 'No responses yet.',
		emptyRespondedCta: 'Find a conversation →',
		emptyArchived: 'Nothing archived yet.',
		// Card helper text — composed JS strings on conversation cards.
		responseCount: (n: number) => (n === 1 ? '1 response' : `${n} responses`),
		meetingCount: (n: number) => (n === 1 ? '1 meeting' : `${n} meetings`),
		editedRelative: (when: string) => `edited ${when}`,
		respondedRelative: (when: string) => `responded ${when}`,
		invitedWaiting: (authorUsername: string) => `invited, waiting for @${authorUsername}`,
		invitationDeclined: 'invitation declined',
		invitationExpired: 'invitation expired',
		// Attention-card sentence: "@marco cancelled this meeting on Fri, 20 Apr"
		cancellationAttention: (username: string, date: string) =>
			`@${username} cancelled this meeting on ${date}`,
		// Quiet action row in the profile card, next to sign out.
		preferencesLink: 'preferences',
		membershipLink: 'membership',
		feedbackLink: 'feedback',
		// Referral share link — copies /waitlist?ref=<username> so a friend
		// lands on the waitlist already marked as invited by this member.
		inviteFriendLink: 'invite a friend',
		inviteFriendCopied: 'link copied',
		inviteFriendFallback: 'Copy this link and send it to your friend:',
		// Quiet site-links row at the bottom of the profile page — the same
		// destinations as the landing/zine footer, so a signed-in member never
		// has to sign out to reach documentation or the legal pages.
		footerDocs: 'Documentation',
		footerCommunity: 'Wiggling',
		footerNewsletter: 'Newsletter',
		footerLegal: 'Legal',
	},

	// ── Preferences ────────────────────────────────────────────────────
	preferences: {
		_routes: ['/profile/preferences', '/conversations/[id]', '/meetings/[id]', '/discover'],
		_description:
			'Notification settings. Email is strictly opt-in: members add an address to receive notification emails; per-event toggles refine which events. No address, no mail. The notificationHint* strings surface this opt-in elsewhere (conversation, meeting) — channel-agnostic, possibility-framed, never naming email; {link} marks where the linked words render and point to /profile/preferences.',
		title: 'Preferences',
		backToProfile: '← profile',
		emailPlaceholder: 'Add an email address to turn on notifications',
		emailAriaLabel: 'Email address for notifications',
		save: 'save',
		emailError: "Couldn’t save that address. Please try again.",
		emailPrefsHeading: 'Email me about',
		prefInvitationReceived: 'New invitations',
		prefInvitationAnswered: 'Replies to my invitations',
		prefMeetingCancelled: 'Cancelled meetings',
		// Contextual hint (NotificationHint): one quiet, channel-agnostic line at a
		// notification moment. {link} marks where notificationHintLink renders as a
		// link to /profile/preferences. Possibility, not instruction; never says "email".
		notificationHintLink: 'get notified',
		notificationHintInvited: (username: string) => `You can {link} if @${username} accepts.`,
		notificationHintInviteReceived: 'You can {link} if someone invites you to meet.',
		notificationHintMeeting: 'You can {link} if this meeting changes.',
		// Preferences-page note (U6). By-choice, default-off, channel-agnostic.
		// Must not reference a sign-up/account email or treat contact as identity.
		notificationPrefsNote:
			"By default, dyad doesn’t send notifications. Choose what you’d like to receive; you can change this anytime.",
		// Compact list — every feedback_received signal (visible or not), one
		// row per item, matching the emailPrefsHeading/pref-row pattern above
		// rather than the fuller card shown inline on a meeting's reveal.
		feedbackHeading: 'Feature feedback on your profile',
		feedbackHint: 'Anyone who visits your profile can see what you check. Change your mind any time.',
		membershipHeading: 'Membership',
		membershipManage: 'manage membership',
		membershipManageError: 'We couldn’t open the membership portal just now. Please try again.',
		membershipRenew: 'renew membership',
		membershipJoin: 'become a member',
		membershipNone: 'You’re not a member yet.',
		membershipLapsed: 'Your membership has lapsed.',
		membershipEnded: 'Your complimentary membership has ended.',
		planMonthly: 'Monthly membership',
		planAnnual: 'Yearly membership',
		planLifetime: 'Lifetime membership',
		planComp: 'Complimentary membership',
	},

	// ── Membership area (profile) ──────────────────────────────────────
	// The member-facing view for reviewing and managing an existing
	// membership, extracted out of Preferences into /profile/membership.
	// TODO: the membership state/plan/manage strings this view renders still
	// live under copy.preferences.membership* — a later cleanup can move them
	// into this section. Reusing them for now keeps the extraction functional.
	membershipArea: {
		_routes: ['/profile/membership'],
		_description:
			'Standalone membership management view, sibling to Preferences. Shows the current plan and a manage link (Stripe portal) for active members, and the ended/lapsed/none states pointing at /membership. Copy for those states is reused from copy.preferences.membership* for now.',
		title: 'Membership',
		backToProfile: '← profile',
	},

	// ── Feedback area (profile) ────────────────────────────────────────
	// Standalone "feature feedback on your profile" view, sibling to
	// Preferences and Membership rather than nested under Preferences.
	feedbackArea: {
		_routes: ['/profile/feedback'],
		_description:
			'Standalone view for reviewing feedback received from meetings and choosing which pieces to feature on the public profile. Sibling to Preferences and Membership. Copy for the list itself is reused from copy.preferences.feedback* for now.',
		title: 'Feedback',
		backToProfile: '← profile',
		empty: "You haven’t received any feedback yet.",
	},

	// ── Meeting detail ─────────────────────────────────────────────────
	meeting: {
		_routes: ['/meetings/[id]'],
		_description: 'Single meeting view with time/location details, linked conversation, and cancel action.',
		addToCalendar: 'Add to calendar',
		cancelMeeting: 'Cancel meeting',
		cancelling: 'Cancelling…',
		cancelConfirm: 'Are you sure you want to cancel this meeting?',
		cancelTitle: (username: string) => `Cancel your meeting with @${username}?`,
		cancelBodyEarly: (username: string) =>
			`You’re cancelling more than 12 hours out, so the slot goes back to discover. @${username} will see your note on the conversation.`,
		cancelBodyLate: (username: string) =>
			`This is a late cancellation. @${username} won’t have much time to make other plans, so a real explanation matters here.`,
		cancelReasonLabelEarly: (username: string) => `A message to @${username}`,
		cancelReasonLabelLate: (username: string) => `Tell @${username} what happened`,
		cancelReasonPlaceholderEarly: 'A sentence or two.',
		cancelReasonPlaceholderLate: 'Be honest. It helps.',
		cancelGenericError: 'Couldn’t cancel the meeting. Please try again.',
		cancelKeep: 'Keep meeting',
		cancelConfirmEarly: 'Cancel meeting',
		cancelConfirmLate: 'Cancel anyway',
		cancelConfirmLateNoNote: 'Cancel without explanation',
		// Group-aware cancellation. A joiner LEAVES (the gathering continues);
		// the author either cancels one seat or calls the whole time off.
		cancelTitleLeave: 'Leave this gathering?',
		cancelBodyLeaveEarly: (username: string) =>
			`The gathering continues without you. @${username} will see your note.`,
		cancelBodyLeaveLate: (username: string) =>
			`This is a late change. The gathering continues, but @${username} won’t have much time to adjust, so a real explanation matters here.`,
		cancelTitleChoice: 'What would you like to cancel?',
		// The author picks people (checkboxes) or the entirety. Cancelling
		// people keeps the time open; the entirety withdraws it.
		cancelScopeGathering: 'The whole gathering (this time is withdrawn)',
		cancelBodySelectionEarly: (n: number) =>
			n === 1
				? 'Their meeting is cancelled and they’re notified. The time stays open for everyone else.'
				: 'Their meetings are cancelled and they’re notified. The time stays open for everyone else.',
		cancelBodySelectionLate: (n: number) =>
			n === 1
				? 'This is a late cancellation. They won’t have much time to make other plans. The time stays open for everyone else.'
				: 'This is a late cancellation for them. They won’t have much time to make other plans. The time stays open for everyone else.',
		cancelReasonLabelSelection: 'A message to them',
		cancelConfirmSelection: (n: number) => (n === 1 ? 'Cancel for one person' : `Cancel for ${n} people`),
		cancelBodyGatheringEarly: (count: number) =>
			`This calls the time off for ${count === 1 ? 'your one confirmed joiner' : `all ${count} people`}. Everyone is notified, the time is withdrawn, and your note travels with the cancellation.`,
		cancelBodyGatheringLate: (count: number) =>
			`This is a late cancellation for ${count === 1 ? 'your one confirmed joiner' : `all ${count} people`}. They won’t have much time to make other plans, so a real explanation matters here.`,
		cancelReasonLabelGathering: 'A message to everyone',
		cancelConfirmGatheringEarly: 'Call off the gathering',
		cancelConfirmGatheringLate: 'Call it off anyway',
		when: 'When',
		duration: 'Duration',
		area: 'Area',
		location: 'Location',
		who: 'Who',
		minutes: 'minutes',
		// Feedback-status block on the meeting detail page.
		feedbackDue: 'You have feedback to submit',
		giveFeedback: 'Give feedback',
		feedbackWaitingForOther: 'Feedback submitted. Waiting for the other person.',
		revealedTitle: 'What they shared with you',
		revealedNoShow: 'They reported you didn’t meet',
		// .ics calendar event metadata
		calendarTitlePrefix: 'dyad: ',
		calendarFallbackTitle: (username: string) => `Meeting with @${username}`,
		// Interim safety floor: a gathering participant flags a problem to moderators.
		reportProblem: 'Report a problem',
		reportTitle: 'Report a problem',
		reportBody: 'If something felt unsafe or off about this gathering, tell us. A moderator will read it.',
		reportLabel: 'What happened?',
		reportPlaceholder: 'A few sentences. Be honest. It helps us look into it.',
		reportSubmit: 'Send report',
		reportSubmitting: 'Sending…',
		reportCancel: 'Cancel',
		reportThankYou: 'Thanks. A moderator will look into this.',
		reportGenericError: 'Couldn’t send the report. Please try again.',
	},

	// ── Feedback ───────────────────────────────────────────────────────
	feedback: {
		_routes: ['/feedback/[id]'],
		_description: 'Post-meeting feedback form. Gated — blocks all app access until submitted.',
		howDidItGo: 'How did it go?',
		weMet: 'We met',
		weDidntMeet: "We didn’t meet",
		thankYou: 'Thank you',
		submitted: 'Your feedback has been submitted.',
		continue: 'Continue',
		continueToDiscover: 'Continue to discover',
		whatHappened: 'What happened?',
		selectTags: 'Select any that apply:',
		shareWithPerson: 'What would you like to share with them?',
		shareWithPersonHint: 'This will be shared with them after they also submit feedback.',
		shareWithPlatform: 'Anything you want to share with us?',
		submitFeedback: 'Submit feedback',
		submitting: 'Submitting…',
		revealIntro: (username: string) => `Here’s what @${username} shared with you:`,
		revealIntroFallback: "Here’s what they shared with you:",
		// Feature-on-profile toggle, shown alongside a revealed feedback card
		// (/feedback/[id] reveal step, /meetings/[id] revealed-section). The
		// reviewer is never named even here, so featuring publicly only widens
		// the audience of already-anonymous words — no separate reviewer
		// consent step.
		featureToggleLabel: 'Feature this on your profile',
		featureToggleHint: 'Anyone who visits your profile can see it. Remove it any time.',
		featuredBadge: 'Featured on your profile',
		unfeatureLabel: 'Remove from profile',
		featureError: 'Couldn’t update. Please try again.',
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
		personalFeedbackLabel: 'Any personal feedback you’d like to give?',
		personalFeedbackPlaceholder: 'Optional',
		submit: 'Submit feedback',
		submitting: 'Submitting…',
		thankYou: 'Thank you',
		submitted: 'Your feedback has been submitted.',
		continueToDiscover: 'Continue to discover',
	},

	// ── Gathering feedback (unified post-conversation form) ──────────────
	// One form for every conversation, 1-on-1 or group. Domain terms
	// (gathering / prompt / reviewee) never surface — members see
	// "conversation" and "the people you met". See CLAUDE.md § Domain language.
	gatheringFeedback: {
		_routes: ['/feedback/gathering/[id]'],
		_description: 'Unified post-conversation feedback. Attendance is mandatory; per-person positive notes and a confidential concern channel are optional. Gated — blocks all app access until attendance is confirmed.',
		title: 'How was the conversation?',

		// Attendance — mandatory, branches on "no".
		attendanceQuestion: 'Did you meet?',
		wentYes: 'Yes, we met',
		wentNo: 'No',
		cancelledOption: 'It was cancelled beforehand',
		absentOption: 'I couldn’t make it',
		absenceReasonLabel: 'Anything you’d like to add?',
		optional: 'Optional',

		// Host-only turnout attestation.
		hostTurnoutHeading: 'Who came?',
		hostTurnoutHint: 'You set this up, so you can note who turned up.',
		present: 'Came',
		noShow: 'No‑show',

		// Per-person positive feedback (only when you turned up).
		peopleHeading: 'The people you met',
		didntGoNote: 'Since you didn’t meet, there’s nothing more to add here.',
		positiveLabel: 'Share something positive',
		positiveNote: 'They’ll see what you share.',
		positiveTextPlaceholder: 'Optional — a note just for them',

		// Confidential concern — quiet, non-accusatory, never the headline.
		concernLink: 'Raise a private concern',
		concernAboutMeeting: 'Raise a concern about this meeting',
		concernNote: 'Only a steward reads this. The other person is never told.',
		concernKindNoShow: 'They didn’t show up',
		concernKindUnsafe: 'I felt uncomfortable or unsafe',
		concernKindOther: 'Something else',
		concernDetailPlaceholder: 'Optional — anything that would help a steward',
		concernSaved: 'Sent to a steward',
		concernCancel: 'never mind',

		// Meet-again — one gathering-level pulse.
		meetAgainQuestion: 'Would you meet again?',
		yes: 'Yes',
		no: 'No',

		submit: 'done',
		submitting: 'Submitting…',
		thankYou: 'Thank you',
		submitted: 'Thanks — that’s all we needed.',
		continueToDiscover: 'Continue to discover',
	},

	// ── Waitlist ───────────────────────────────────────────────────────
	waitlist: {
		_routes: ['/waitlist', '/ (AuthDialog)'],
		_description: 'Public waitlist request page and AuthDialog modal.',
		thankYou: 'Thank you. We’ll be in touch.',
		alreadyOnWaitlist: 'You’re already on our list. We’ll be in touch soon.',
		thanksForJoining: 'Thanks for joining. We’ll be in touch within a week.',
		joinWaitlist: 'Join the waitlist',
		joinWaitlistButton: 'Join waitlist',
		sendingWaitlist: 'Sending…',
		thoughtPlaceholder: "What’s in a conversation?",
		city: 'City',
		cityPlaceholder: 'Berlin',
		// "Where did you spot us?" — ozge’s design (pre-open repo, b4e32ee):
		// member-stated arrival channel, explicitly framed as not-tracking.
		referralLabel: 'Where did you spot us?',
		referralNote: 'We do not track your moves online. Your answer here would help us understand how word travels.',
		referralOptions: [
			{ value: 'friend', label: 'Through a friend' },
			{ value: 'instagram', label: 'Instagram' },
			{ value: 'twitter', label: 'Twitter / X' },
			{ value: 'linkedin', label: 'LinkedIn' },
			{ value: 'event', label: 'An event' },
			{ value: 'newsletter', label: 'Newsletter' },
			{ value: 'other', label: 'Other' }
		],
		referralSelectPlaceholder: 'Pick one',
		referralOtherPlaceholder: 'Tell us where',
		// Newsletter: the opt-in happens ON Substack (they are the controller —
		// see 20260417110000_drop_newsletter_subscribers). We hold nothing.
		newsletterInvite: 'We also write a newsletter, hosted on Substack.',
		newsletterCta: 'Subscribe on Substack',
		cityExpansionNote: 'We’re currently active in Berlin and will expand to other cities soon.',

		// /waitlist page + waitlist modal — shared intro under the "Request to
		// join" heading. introDocsLink renders inline inside introPre/introPost;
		// introJoin is the second paragraph, naming what the consent cards below
		// it are for.
		pageTitle: 'join · dyad.',
		heading: 'Request to join',
		introPre: 'Dyad is an offline network where people meet on their own terms and can take part in shaping the product and its policies. We review each request to preserve an environment where people feel safe enough to take part and enjoy being here. We detail our thinking and processes in the ',
		introDocsLink: 'documentation section',
		introDocsHref: '/docs',
		introPost: '.',
		introJoin: 'To join, please read and acknowledge the Community Standards and Member Agreements, and tell us why you would like to join.',
		// Acknowledgement cards — same consent treatment as the membership
		// flow's common-ground step. Both must be checked before the request
		// sends; each card links its full document in /docs.
		consentStandardsTitle: 'Community Standards',
		consentStandardsDesc: 'I have read and agree to the Community Standards: what we do not tolerate, and what happens when something goes wrong.',
		consentStandardsLinkLabel: 'Read the Community Standards →',
		consentStandardsHref: '/docs#standards',
		consentAgreementsTitle: 'Member Agreements',
		consentAgreementsDesc: 'I have read and agree to the Member Agreements: who can join, what membership includes, and what it is not.',
		consentAgreementsLinkLabel: 'Read the Member Agreements →',
		consentAgreementsHref: '/docs#agreements',
		consentRequired: 'Please confirm the Community Standards and Member Agreements before requesting to join.',
		successMessage: "Thank you. We’ll be in touch.",
		freewriteLabel: 'Why do you want to join?',
		freewritePlaceholder: "What’s in a conversation?",
		namePlaceholder: 'Name',
		emailPlaceholder: 'Email',
		sending: 'Sending…',
		submitCta: 'Request to join',
		freewriteRequired: 'Please share your thoughts before joining.',
		// Every field on the request form is required — the ask is small and deliberate.
		allRequired: 'Please answer every field — each one helps us welcome you well.',
		genericError: 'Something went wrong',
	},

	// ── Auth ───────────────────────────────────────────────────────────
	auth: {
		_routes: ['/login', '/join', '/signup', '/ (AuthDialog)'],
		_description: 'Login page, signup/OTP page, invitation-based join page, and AuthDialog (modal on landing page).',
		welcomeBack: 'Welcome back',
		signInSubtitle: 'Sign in to create and join conversations',
		signIn: 'Sign in',
		loggingIn: 'Signing in…',
		forgotPassword: 'Forgot password?',
		passwordHint: 'At least 8 characters',
		email: 'Email',
		password: 'Password',
		name: 'Name',
		alreadyHaveAccount: 'Already have an account?',
		dontHaveAccount: "Don’t have an account?",
		join: 'Join',
		logIn: 'Sign in',
		somethingWentWrong: 'Something went wrong. Please try again.',

		// Login page — reset / update-password sub-modes
		resetPasswordTitle: 'Reset password',
		setNewPasswordTitle: 'Set new password',
		resetSubtitle: 'Enter your email to receive a reset link',
		resetLinkExpired:
			'That reset link has expired or was already used. Enter your email and we will send you a new one.',
		updateSubtitle: 'Choose a new password for your account',
		signingIn: 'Signing in…',
		sending: 'Sending…',
		updating: 'Updating…',
		sendResetLink: 'Send reset link',
		updatePasswordAction: 'Update password',
		goToDashboard: 'Go to dashboard',
		newPasswordLabel: 'New password',
		passwordPlaceholder: 'Password',
		emailPlaceholder: 'Email',

		// <title> variants for the login page
		pageTitleLogin: 'login · dyad. cultivating a culture of conversation',
		pageTitleReset: 'reset password · dyad. cultivating a culture of conversation',
		pageTitleUpdate: 'set new password · dyad. cultivating a culture of conversation',

		// Signup / OTP page
		signupPageTitle: 'Join dyad.',
		checkYourEmail: 'Check your email',
		otpIntro: 'We sent a 6-digit code to',
		verifying: 'Verifying…',
		confirm: 'Confirm',
		wrongEmail: 'Wrong email?',
		startOver: 'Start over',
		youreInvited: "You’re invited",
		createAccountSubtitle: 'Create your account to join the conversation.',
		usernamePlaceholder: 'Username',
		usernameTitle: 'Lowercase letters, numbers, underscores, and hyphens only',
		usernameHintShort: 'Your public URL: dyad.social/',
		usernameHintLong: 'This will be your public URL: dyad.social/',
		passwordWithMinPlaceholder: 'Password (at least 8 characters)',
		creatingAccount: 'Creating account…',
		createAccount: 'Create account',

		// Invitation-based join page
		joinPageTitle: 'Join dyad. · cultivating a culture of conversation',
		welcomeToDyad: 'Welcome to dyad.',
		invitationExpired: 'Invitation expired',
		invitationExpiredSubtitle: 'This invitation link is no longer valid. It may have expired or already been used.',
		backToHome: 'Back to home',

		// Group-link join page (shared conference/corner links)
		groupJoinTitle: 'Join {name}',
		groupJoinSubtitle: 'Create your account to join the conversations in this corner.',
		groupLinkUnknown: 'This link isn’t valid',
		groupLinkUnknownSubtitle: 'Check that you copied the whole link, or ask the organizers for a fresh one.',
		groupLinkClosed: 'Joining has closed',
		groupLinkClosedSubtitle: 'This corner is no longer taking new members through this link.',
		groupLinkFull: 'This corner is full',
		groupLinkFullSubtitle: 'All the places through this link are taken. Ask the organizers.',
		groupLinkRevoked: 'This link is no longer available',
		groupLinkRevokedSubtitle: 'The organizers have switched this link off. Ask them for a current one.',
		groupAlreadyMember: 'You already have an account',
		groupAlreadyMemberSubtitle: 'You’re signed in. Corner access is granted by the organizers.',
		groupGoToDiscover: 'Go to discover',
		groupEmailRegistered: 'An account with this email already exists. Sign in instead.',
		groupTooManyAttempts: 'Too many attempts. Wait a moment and try again.',
		groupSetupFailed: 'Could not finish setting up your account. Please try again.',
		// Action-time redemption failures (link state changed between page
		// load and submit). Compact inline-error variants of the page states.
		groupJoinErrors: {
			full: 'This corner is full. Ask the organizers.',
			closed: 'Joining through this link has closed.',
			revoked: 'This link is no longer available.',
			unknown: 'This link isn’t valid.'
		},

		// Access-ended page (expired guest access, /access-ended)
		accessEndedTitle: 'Your access has ended',
		accessEndedSubtitleWithCorner: 'Your time in {name} has come to an end. Thank you for being part of it.',
		accessEndedSubtitle: 'Your guest access has come to an end. Thank you for being part of it.',
		accessEndedForwardPath: 'Want to keep using dyad? Ask the organizers about staying on.',
		accessEndedPageTitle: 'access ended · dyad',
		logOut: 'log out',
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
		copyEditor: 'Copy',
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

	// ── Membership ─────────────────────────────────────────────────────
	membership: {
		_routes: ['/membership'],
		_description:
			'Join/upgrade page and the inline prompts shown when a gated action needs an active membership.',
		pageTitle: 'Membership',
		// Accessible name for the paywall modal dialog (screen readers).
		dialogLabel: 'Membership',

		// Everyone who reaches this copy (the /membership page, or the paywall
		// modal on a gated action) is already signed in. "Member" here means
		// the paid tier: the copy invites a financial contribution that
		// unlocks some product actions, and browsing as a guest stays allowed
		// either way (the page offers a continue-as-guest exit).
		guestHeading: 'Become a member',
		guestIntro:
			'Dyad is entirely member funded. Consider joining us with a contribution for unlimited access to in-person conversations, our weekly newsletter, and collective governance process.',
		continueAsGuestCta: 'continue as a guest',
		lapsedHeading: 'Renew Your Membership',
		lapsedIntro:
			'Your membership has lapsed, so the member-only actions are paused for now. Renewing turns them back on. Everything you have already made stays exactly as it is, and you can stop anytime.',
		grantEndedHeading: 'Your Access Has Ended',
		grantEndedIntro:
			'Your complimentary membership has ended, so the member-only actions are paused for now. You can become a member anytime to turn them back on. Everything you have already made stays exactly as it is.',

		cadenceMonthly: 'Monthly',
		cadenceAnnual: 'Yearly',
		cadenceLifetime: 'Lifetime',
		cadenceMonthlyPrice: '€12',
		cadenceMonthlyPeriod: 'per month',
		cadenceAnnualPrice: '€100',
		cadenceAnnualPeriod: 'per year',
		cadenceLifetimePrice: '€400',
		cadenceLifetimePeriod: 'one-time',
		cadenceAriaLabel: 'Billing cadence',
		tierAriaLabel: 'Contribution tier',
		tierPrompt: 'Choose a tier',
		monthlySolidarityName: 'Solidarity',
		monthlySolidarityPrice: '€7',
		monthlySolidarityNote: 'A lower rate.',
		monthlyStandardName: 'Standard',
		monthlyStandardNote: 'Covers what a membership costs.',
		monthlySupporterName: 'Supporter',
		monthlySupporterPrice: '€17',
		monthlySupporterNote: 'A higher rate that helps fund the lower one.',
		becomeMemberCta: 'start supporting dyad',
		billingNote: 'Billed securely via Stripe. Cancel anytime.',
		// Lifetime is a one-time payment — there is no subscription to cancel,
		// so the note drops "Cancel anytime" for that cadence.
		billingNoteLifetime: 'Billed securely via Stripe. One payment, no renewal.',
		benefits: [
			'Start your own conversations',
			'Respond and meet one-on-one',
			'Join every group conversation',
			'Keep dyad independent, ad-free, and answerable to its members'
		],
		continueCta: 'continue to payment',
		continuing: 'taking you to payment…',

		activeHeading: 'You’re a Member',
		activeSubscription: 'Your membership is active. Thank you for keeping dyad alive.',
		lifetimeConfirmation:
			'You have a lifetime membership. It never lapses and there’s nothing more to do. Thank you.',
		manageCta: 'manage membership',

		finishingUp: 'We’re confirming your membership. This usually takes a few seconds.',
		finishingUpFallback:
			'Still confirming. You can keep browsing; your membership will appear here and on your profile once it’s through. No need to pay again.',
		cancelled: 'No payment was made. You can come back whenever you’re ready.',

		// Inline gated-action prompts. `hadMembership` chooses renew vs join wording.
		gatePrompt: (hadMembership: boolean): string =>
			hadMembership
				? 'Renew your membership to do this.'
				: 'Become a member to do this.',
		gateCta: (hadMembership: boolean): string =>
			hadMembership ? 'renew membership' : 'become a member',

		errorGeneric: 'Couldn’t start checkout. Please try again.',
	},

	// ── Public profile ────────────────────────────────────────────────
	publicProfile: {
		_routes: ['/users/[username]'],
		_description: 'Public-facing profile any member can view — published conversations, a completed-conversations count, plus any feedback the person has chosen to feature.',
		featuredHeading: 'What people say',
		// Trust stat under the name: in-person conversations this member has
		// completed (meetings that reached feedback lock).
		completedCount: (n: number) =>
			n === 1 ? '1 conversation completed' : `${n} conversations completed`,
		// Featured feedback is stepped through one at a time; these name the
		// controls for screen readers and label the position.
		featuredPrev: 'Previous feedback',
		featuredNext: 'Next feedback',
		featuredPosition: (n: number, total: number) => `${n} of ${total}`,
	},

	// ── Emails ─────────────────────────────────────────────────────────
	email: {
		_routes: ['/api/contact', '/api/invites'],
		_description: 'Transactional emails sent server-side. HTML templates in the API route handlers.',
		inviteSubject: 'Welcome to Dyad',
		waitlistSubject: "Cultivating a culture of conversation with Dyad",
		membershipActivatedSubject: 'Your membership is active',
		membershipActivatedBody:
			'Thank you for joining us as a member. Your membership is active. We build dyad to stay independent and in service to connection, collective sensemaking and community — your membership is what makes that possible, and it’s what lets you start conversations, respond, and meet. You can review or manage it any time.',
		// Lapsed / renewal reminder — COPY ONLY; no dispatcher wired yet (backend).
		membershipLapsedSubject: 'Your dyad membership has lapsed',
		membershipLapsedBody:
			'Your membership has lapsed, so the member-only actions (starting conversations, responding, and meeting) are paused. Everything you’ve made is still here. Whenever you’re ready, renewing turns it all back on.',
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

	// ── About — the long-scroll story of what Dyad is for ──────────────
	about: {
		_routes: ['/about'],
		_description: 'The /about story page: fixed photo backdrop, coloured panels sliding over it. Quotes and fragments are illustrative until real Public Sentiment data exists; keep them labelled that way.',
		title: 'What should we be paying attention to?',
		metaDescription: 'Public Sentiment brings people into conversation, learns from what emerges, and explores how lived experience can inform what civil society chooses to pay attention to.',
		// Placeholder until the new name is chosen: every mention on /about
		// reads from here.
		brandName: 'Public Sentiment',
		navAbout: 'About',
		navHow: 'How it works',
		navPrinciples: 'Principles',
		navJoin: 'Become a member',
		navUpcoming: 'Upcoming conversations',
		navSearch: 'Search',
		navMenu: 'Menu',
		navClose: 'Close',
		navLatest: 'Explore the latest',
		navJoinShort: 'Join',
		heroLines: ['Come talk', 'with people near you', 'about what matters.'],
		heroHeadline: 'What should we be paying attention to?',
		heroLede: 'Public Sentiment is a way to meet in person and talk through a question that matters to you, in a small group. We are part of the open social web and the movement for collective ownership. No algorithm chooses who you meet or what you see. You come, sit down, and talk it through together.',
		ctaJoin: 'Join a conversation',
		ctaExplore: 'Explore the idea',
		ctaHost: 'Host a conversation',
		ctaWork: 'Work with Public Sentiment',
		upcomingKicker: 'Upcoming conversations',
		upcomingHeadline: 'Pull up a chair.',
		upcomingCityLabel: 'Choose a city',
		upcomingSampleLabel: 'Examples, until conversations are scheduled here',
		upcomingSampleTitles: [
			'Where does belonging begin?',
			'What would you stop paying attention to?',
			'Who taught you to listen?',
			'Is ambition overrated?',
			'What do we owe our neighbours?'
		],
		upcomingSampleDays: ['Thu Oct 8', 'Sat Oct 10', 'Sun Oct 11', 'Tue Oct 13', 'Fri Oct 16'],
		upcomingSampleAreasBerlin: ['Kreuzberg', 'Neukölln', 'Wedding', 'Prenzlauer Berg', 'Friedrichshain'],
		upcomingSampleAreasAmsterdam: ['De Pijp', 'Oost', 'Noord', 'Jordaan', 'West'],
		upcomingSticker: 'Save a seat',
		formatOneOnOne: 'One-on-one',
		formatGroup: 'Small group',
		cardTicket: 'Buy a ticket',
		cardMember: 'Become a member',
		cardOr: 'or',
		// The page a card opens (/about/conversations/[slug]).
		detailBack: 'All upcoming conversations',
		detailSampleNote: 'An example conversation. Names, times and places are illustrative.',
		detailCta: 'Become a member to save a seat',
		detailSeatsLeft: (n: number) => (n === 1 ? '1 seat left' : `${n} seats left`),
		detailFacts: { when: 'When', where: 'Where', who: 'Who', length: 'Length' },
		detailWhereNote: 'The exact address is shared with you once your seat is confirmed.',
		detailWhoGroup: (n: number) => `${n} people, one table`,
		detailWhoPair: 'Two people',
		detailWhyHeading: 'Why this question',
		detailBringHeading: 'What to bring',
		detailHowHeading: 'How the conversation goes',
		detailHow: [
			'You arrive and meet the others. Nobody introduces themselves by job.',
			'The host reads the question once, then stays quiet. Anyone can start.',
			'There is no winning and no summing up. People speak, others listen.',
			'Phones stay in bags. Afterwards you can share, anonymously, what stayed with you.'
		],
		detailAfterHeading: 'What we do afterwards',
		detailAfter: 'With your permission, we keep a short note of what was said, without names. Across many conversations these notes show what people keep coming back to. You can read what we found.',
		detailHostHeading: 'Your host',
		detailMoreHeading: 'More conversations',
		detailFaqHeading: 'Good to know',
		detailFaq: [
			['Do I need to prepare?', 'Only to think about the question for a minute. There is nothing to read.'],
			['Can I bring a friend?', 'Each person books their own seat, so the table stays a mix of people who have not met.'],
			['What if I can’t come?', 'Let us know any time before the day and we will offer your seat to someone else.']
		],
		conversationKicker: 'Start with a conversation',
		conversationHeadline: 'You become what you pay attention to.',
		conversationBody: 'We are shaped by the people around us and by what reaches us every day. Public Sentiment changes the feed: a question you care about, someone new across the table, an hour with no screen. The best part happens after you put your phone away.',
		manyKicker: 'From one conversation to many',
		manyHeadline: 'Not consensus. Not polling. Patterns.',
		manyBody: 'What people care about most is rarely what can be counted, sold or traded. It shows up in how they talk. One conversation tells us something. Hundreds might show what keeps coming back, where people disagree, and what we have no words for yet.',
		manyFragments: [
			'I don\'t know where belonging is allowed to begin.',
			'For me it is about time, not money.',
			'I disagree. It is about rent.',
			'Nobody asked us before the plan was made.',
			'I barely know my neighbours and I think that is fine.',
			'We have no word for this yet.'
		],
		illustrativeLabel: 'Illustrative, not real data',
		noticeQuote: 'It is no measure of health to be well adjusted to a profoundly sick society.',
		noticeSource: 'Jiddu Krishnamurti',
		flowKicker: 'From experience to attention',
		flowSteps: ['Lived experience', 'Conversation', 'Collective sensemaking', 'Emerging civic questions', 'Institutional attention'],
		flowNote: 'Before society can decide what to do about something, it has to notice it.',
		differentKicker: 'What makes Public Sentiment different',
		differentRows: [
			'A poll asks people to choose between answers already written.',
			'A consultation asks for feedback on something already proposed.',
			'A citizens\' assembly deliberates on a question already chosen.'
		],
		differentDyad: 'Public Sentiment works one step earlier: letting the questions themselves surface from lived experience, before anyone has decided what the agenda is.',
		differentNote: 'We are not replacing these processes. We are asking how a society notices what deserves them.',
		learningKicker: 'What we are learning',
		learningHeard: 'We heard',
		learningQuote: 'People aren\'t necessarily lonely. They don\'t know where belonging is allowed to begin.',
		learningMeta: ['Appeared across: not yet measured', 'Different interpretations: not yet measured', 'Unresolved questions: not yet measured'],
		institutionsKicker: 'For institutions',
		institutionsHeadline: 'Listen before you set the agenda.',
		institutionsBody: 'Organisations spend enormous resources responding to problems that were named long before they arrived. Public Sentiment offers a way to hear what people think deserves attention before strategies harden into programmes.',
		institutionsList: ['Civil society', 'Foundations', 'Universities', 'Cultural institutions', 'Municipalities', 'Public-interest researchers'],
		principlesKicker: 'Principles',
		principlesLead: 'Nobody wants a world built for distraction and outrage. It keeps getting built anyway, because that is what the incentives reward. We are choosing different ones.',
		principlesNo: ['No infinite scroll.', 'No attention extraction.', 'No black-box agenda.', 'No paying to be heard.'],
		principlesYes: ['Transparent methods.', 'Visible disagreement.', 'Real-world conversation.', 'Public knowledge.'],
		finalHeadline: 'Society is already talking. What if we got better at listening?',
		finalBody: 'Change who is around you and what reaches you every day. Start with one conversation.',
		workEmail: 'hello@dyad.berlin'
	},
} as const;
