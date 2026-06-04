<script lang="ts">
	import { goto } from '$app/navigation';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ParticipantsStack from '$lib/components/ParticipantsStack.svelte';
	import { generateICS, downloadICS } from '$lib/utils/calendar.js';
	import { formatShortDate } from '$lib/utils/dates.js';
	import { othersBeyond } from '$lib/domain/gathering.js';
	import { capture } from '$lib/analytics';
	import type { PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();
	let cancelling = $state(false);
	let cancelDialog = $state<HTMLDialogElement | undefined>();
	let cancelReason = $state('');
	let cancelError = $state('');
	let cancelErrorRef = $state<string | null>(null);

	// Interim safety floor: report a problem about this gathering to moderators.
	let reportDialog = $state<HTMLDialogElement | undefined>();
	let reportText = $state('');
	let reportSubmitting = $state(false);
	let reportSubmitted = $state(false);
	let reportError = $state('');
	const reportTrimmed = $derived(reportText.trim());
	const canSubmitReport = $derived(!reportSubmitting && reportTrimmed.length >= 10);

	// Cancellation tier mirrors the cancel_meeting RPC: >12h away = early (reason required).
	const isEarly = $derived(
		new Date(data.meeting.scheduled_time).getTime() - Date.now() > 12 * 60 * 60 * 1000
	);
	const reasonTrimmed = $derived(cancelReason.trim());
	const canSubmitCancel = $derived(
		!cancelling && (!isEarly || reasonTrimmed.length >= 10)
	);
	// Button label adapts to social weight: late-without-note makes the social cost visible.
	const cancelButtonLabel = $derived.by(() => {
		if (cancelling) return copy.meeting.cancelling;
		if (isEarly) return copy.meeting.cancelConfirmEarly;
		return reasonTrimmed.length === 0
			? copy.meeting.cancelConfirmLateNoNote
			: copy.meeting.cancelConfirmLate;
	});

	function formatMeetingDate(iso: string): string {
		const d = new Date(iso);
		const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
		const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		return `${date} · ${time}`;
	}

	function handleAddToCalendar() {
		const loc = 'exact_location' in data.meeting && data.meeting.exact_location
			? `${data.meeting.exact_location.name}, ${data.meeting.exact_location.address}`
			: data.meeting.general_area;
		const title = `${copy.meeting.calendarTitlePrefix}${data.prompt?.title ?? copy.meeting.calendarFallbackTitle(data.otherUsername)}`;
		const ics = generateICS({
			title,
			start: data.meeting.scheduled_time,
			durationMinutes: data.meeting.duration_minutes,
			uid: data.meeting.id,
			location: loc
		});
		downloadICS(ics, 'dyad-meeting.ics');
	}

	function openCancelDialog() {
		cancelReason = '';
		cancelError = '';
		cancelErrorRef = null;
		cancelDialog?.showModal();
	}

	async function handleCancel() {
		if (!canSubmitCancel) return;
		cancelling = true;
		cancelError = '';
		cancelErrorRef = null;
		try {
			const reason = cancelReason.trim();
			const res = await fetch(`/api/meetings/${data.meeting.id}/cancel`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(reason ? { reason } : {})
			});
			if (res.ok) {
				capture('meeting_cancelled', { tier: isEarly ? 'early' : 'late' });
				cancelDialog?.close();
				goto('/profile');
				return;
			}
			const body = await res.json().catch(() => ({}));
			cancelError = (body as { error?: string }).error ?? copy.meeting.cancelGenericError;
			cancelErrorRef = (body as { reference?: string }).reference ?? null;
		} catch {
			cancelError = copy.meeting.cancelGenericError;
		} finally {
			cancelling = false;
		}
	}

	function openReportDialog() {
		reportText = '';
		reportError = '';
		reportSubmitted = false;
		reportDialog?.showModal();
	}

	async function handleReport() {
		if (!canSubmitReport) return;
		reportSubmitting = true;
		reportError = '';
		try {
			const res = await fetch(`/api/meetings/${data.meeting.id}/report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description: reportTrimmed })
			});
			if (res.ok) {
				reportSubmitted = true;
				setTimeout(() => reportDialog?.close(), 1500);
				return;
			}
			const body = await res.json().catch(() => ({}));
			reportError = (body as { error?: string }).error ?? copy.meeting.reportGenericError;
		} catch {
			reportError = copy.meeting.reportGenericError;
		} finally {
			reportSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Meeting with @{data.otherUsername} - dyad.berlin</title>
</svelte:head>

<div class="content">
	<div class="meeting-header">
		<span class="meeting-with">{data.coParticipants.length > 1 ? copy.profile.meetingWithMany(data.coParticipants) : copy.profile.meetingWith(data.otherUsername)}</span>
	</div>

	{#if data.prompt}
		<a href="/conversations/{data.prompt.id}" class="prompt-item">
			<div class="prompt-row">
				<div class="row-thumb">
					{#if data.prompt.cover_image_url}
						<img src={data.prompt.cover_image_url} alt="" class="thumb-img" />
					{:else}
						<div class="thumb-placeholder"></div>
					{/if}
				</div>
				<div class="row-body">
					<h3 class="row-title">{data.prompt.title || copy.common.untitled}</h3>
				</div>
			</div>
		</a>
	{/if}

	<!-- This page IS the meeting — details laid out as page content, not the
	     gathering card (the card is the preview that links here; repeating it
	     inside its own destination reads as a circular link). -->
	{#if data.cancellation}
		<p class="cancelled-status">
			{data.cancellation.cancelledByMe
				? copy.profile.meetingCancelledByYou
				: data.cancellation.cancelledByUsername
					? copy.profile.meetingCancelledBy(data.cancellation.cancelledByUsername)
					: copy.profile.meetingCancelled}
		</p>
		{#if data.cancellation.reason}
			<blockquote class="cancelled-reason">{data.cancellation.reason}</blockquote>
		{/if}
	{/if}

	<div class="detail-grid">
		<div class="detail-row">
			<span class="label">{copy.meeting.when}</span>
			<div class="value">
				<span class:struck={!!data.cancellation}>
					{formatMeetingDate(data.meeting.scheduled_time)} · {data.meeting.duration_minutes}
					{copy.meeting.minutes}
				</span>
				{#if data.meeting.state === 'scheduled'}
					<button class="calendar-link" onclick={handleAddToCalendar}>{copy.meeting.addToCalendar}</button>
				{/if}
			</div>
		</div>
		<div class="detail-row">
			<span class="label">{copy.meeting.area}</span>
			<span class="value">{data.meeting.general_area}</span>
		</div>
		{#if 'exact_location' in data.meeting && data.meeting.exact_location}
			<div class="detail-row">
				<span class="label">{copy.meeting.location}</span>
				<a
					class="value location"
					href="https://www.openstreetmap.org/?mlat={data.meeting.exact_location.lat}&mlon={data.meeting.exact_location.lng}&zoom=17"
					target="_blank"
					rel="noopener"
				>
					{data.meeting.exact_location.name}<br /><span class="addr">{data.meeting.exact_location.address}</span>
				</a>
			</div>
		{/if}
		{#if !data.cancellation}
			<!-- The room. Author: identified pins linking to each pair's meeting.
			     Attendee: host pin + own "you" pin + neutral circles (slotOccupied
			     counts joiner meetings only — the host has no meeting row — so
			     subtract the viewer's own seat). -->
			<div class="detail-row detail-row--who">
				<span class="label">{copy.meeting.who}</span>
				<div class="value">
					{#if data.isPromptAuthor}
						<ParticipantsStack
							self={{ name: data.username || copy.common.you }}
							participants={data.gathering.map((p) => ({ id: p.meetingId, name: p.username, href: `/meetings/${p.meetingId}` }))}
						/>
					{:else}
						<ParticipantsStack
							self={{ name: data.username || copy.common.you }}
							participants={[{ id: 'host', name: data.otherUsername }]}
							anonymousCount={othersBeyond(data.slotOccupied, 1)}
						/>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if data.invitationMessage}
		<div class="invitation-note">
			<!-- Same attribution idiom as the conversation page's response lines. -->
			<span class="note-label">
				{data.invitationFromMe
					? copy.conversation.youWrote(formatShortDate(data.invitationCreatedAt ?? data.meeting.scheduled_time))
					: copy.conversation.respondedBy(data.otherUsername, formatShortDate(data.invitationCreatedAt ?? data.meeting.scheduled_time))}
			</span>
			<p class="note-body">{data.invitationMessage}</p>
		</div>
	{/if}

	<!-- Feedback status for awaiting_feedback meetings -->
	{#if data.meeting.state === 'awaiting_feedback' && data.myFeedbackForm}
		<section class="feedback-status">
			{#if data.myFeedbackForm.state === 'due'}
				<p class="feedback-prompt">{copy.meeting.feedbackDue}</p>
				<a href="/feedback/{data.myFeedbackForm.id}" class="btn-primary">{copy.meeting.giveFeedback}</a>
			{:else if data.myFeedbackForm.state === 'submitted'}
				<p class="feedback-waiting">{copy.meeting.feedbackWaitingForOther}</p>
			{/if}
		</section>
	{/if}

	<!-- Revealed feedback for completed meetings -->
	{#if data.revealedFeedback && data.revealedFeedback.length > 0}
		<section class="revealed-section">
			<h2 class="section-title">{copy.meeting.revealedTitle}</h2>
			{#each data.revealedFeedback as fb}
				<div class="reveal-card">
					{#if fb.did_meet === false}
						<p class="reveal-noshow">{copy.meeting.revealedNoShow}</p>
					{/if}
					{#if fb.share_with_person}
						<blockquote class="reveal-quote">{fb.share_with_person}</blockquote>
					{/if}
					{#if fb.rating_tags.length > 0}
						<ul class="reveal-tags" role="list">
							{#each fb.rating_tags as tag}
								<li class="reveal-tag">{tag}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	<!-- Page-level actions: this is the place to act on a meeting, so the
	     actions live in the body, not behind a context menu. -->
	<section class="meeting-actions">
		{#if data.meeting.state === 'scheduled'}
			<button class="action-cancel" onclick={openCancelDialog}>{copy.meeting.cancelMeeting}</button>
		{/if}
		<button class="action-report" onclick={openReportDialog}>{copy.meeting.reportProblem}</button>
	</section>

	{#if data.meeting.state === 'scheduled'}
		<dialog bind:this={cancelDialog} class="cancel-dialog" aria-labelledby="cancel-title">
			<div class="cancel-inner">
				<h3 id="cancel-title" class="cancel-title">{copy.meeting.cancelTitle(data.otherUsername)}</h3>
				<p class="cancel-when">{formatMeetingDate(data.meeting.scheduled_time)}</p>
				<p class="cancel-body" class:cancel-body--late={!isEarly}>
					{isEarly
						? copy.meeting.cancelBodyEarly(data.otherUsername)
						: copy.meeting.cancelBodyLate(data.otherUsername)}
				</p>

				<div class="field">
					<label for="cancel-reason">
						{isEarly
							? copy.meeting.cancelReasonLabelEarly(data.otherUsername)
							: copy.meeting.cancelReasonLabelLate(data.otherUsername)}
					</label>
					<textarea
						id="cancel-reason"
						bind:value={cancelReason}
						rows={4}
						maxlength={2000}
						placeholder={isEarly
							? copy.meeting.cancelReasonPlaceholderEarly
							: copy.meeting.cancelReasonPlaceholderLate}
					></textarea>
				</div>

				{#if cancelError}
					<p class="field-error" role="alert">
						{cancelError}
						{#if cancelErrorRef}
							<span class="field-error-ref">ref: {cancelErrorRef}</span>
						{/if}
					</p>
				{/if}

				<div class="cancel-actions">
					<button class="btn-secondary" onclick={() => cancelDialog?.close()} disabled={cancelling}>
						{copy.meeting.cancelKeep}
					</button>
					<button
						class="btn-danger"
						class:btn-danger--soft={!isEarly && reasonTrimmed.length === 0}
						onclick={handleCancel}
						disabled={!canSubmitCancel}
					>
						{cancelButtonLabel}
					</button>
				</div>
			</div>
		</dialog>
	{/if}

	<!-- Report a problem lives in the FloatingNav kebab menu; dialog triggered from there. -->
	<dialog bind:this={reportDialog} class="report-dialog" aria-labelledby="report-title">
		{#if reportSubmitted}
			<div class="report-success">
				<p>{copy.meeting.reportThankYou}</p>
			</div>
		{:else}
			<div class="report-inner">
				<h3 id="report-title" class="report-title">{copy.meeting.reportTitle}</h3>
				<p class="report-body">{copy.meeting.reportBody}</p>

				<div class="field">
					<label for="report-text">{copy.meeting.reportLabel}</label>
					<textarea
						id="report-text"
						bind:value={reportText}
						rows={4}
						maxlength={2000}
						placeholder={copy.meeting.reportPlaceholder}
						disabled={reportSubmitting}
					></textarea>
				</div>

				{#if reportError}
					<p class="field-error" role="alert">{reportError}</p>
				{/if}

				<div class="cancel-actions">
					<button class="btn-secondary" onclick={() => reportDialog?.close()} disabled={reportSubmitting}>
						{copy.meeting.reportCancel}
					</button>
					<button class="btn-primary" onclick={handleReport} disabled={!canSubmitReport}>
						{reportSubmitting ? copy.meeting.reportSubmitting : copy.meeting.reportSubmit}
					</button>
				</div>
			</div>
		{/if}
	</dialog>
</div>

<!-- Meeting actions live in the page body, not the nav kebab. -->
<FloatingNav variant="detail" attentionCount={data.attentionCount ?? 0} />

<style>
	.content { width: 100%; max-width: var(--content-narrow); padding-bottom: var(--nav-clearance); }

	.meeting-header { margin-bottom: var(--space-6); }
	.meeting-with { font-size: var(--text-2xl); font-weight: normal; display: block; line-height: var(--leading-tight); }
	.calendar-link { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-link); background: none; border: none; padding: 0; cursor: pointer; display: block; margin-top: var(--space-2); }
	.calendar-link:hover { text-decoration: underline; }

	/* Detail rows — the page body IS the meeting detail. */
	.detail-grid { display: flex; flex-direction: column; margin-bottom: var(--space-6); }
	.detail-row { display: flex; gap: var(--space-4); padding: var(--space-3) 0; border-bottom: 1px solid var(--border-link); }
	.detail-row--who { align-items: center; }
	.label { font-size: var(--text-sm); color: var(--text-muted); width: 80px; flex-shrink: 0; }
	.value { font-size: var(--text-base); }
	.struck { text-decoration: line-through; color: var(--text-muted); }
	.location { font-weight: 500; color: inherit; text-decoration: none; }
	.location:hover { text-decoration: underline; }
	.addr { font-size: var(--text-xs); color: var(--text-muted); font-weight: normal; }

	/* Cancelled: quiet page-level status above the rows. */
	.cancelled-status { font-size: var(--text-sm); font-style: italic; color: var(--text-muted); margin: 0 0 var(--space-2); }
	.cancelled-reason { font-size: var(--text-sm); font-style: italic; color: var(--text-secondary); line-height: var(--leading-relaxed); margin: 0 0 var(--space-4); padding: 0; border: none; }

	/* Page-level actions — visible, quiet text buttons. */
	.meeting-actions { display: flex; gap: var(--space-5); margin-top: var(--space-8); padding-top: var(--space-4); border-top: 1px solid var(--border-link); }
	.meeting-actions button { font-family: inherit; font-size: var(--text-sm); background: none; border: none; padding: 0; cursor: pointer; }
	.action-cancel { color: var(--color-danger); }
	.action-cancel:hover { text-decoration: underline; }
	.action-report { color: var(--text-muted); }
	.action-report:hover { color: var(--text-primary); text-decoration: underline; }

	.invitation-note { margin-bottom: var(--space-6); }
	.note-label { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin-bottom: var(--space-1); }
	.note-body { font-size: var(--text-md); line-height: var(--leading-normal); margin: 0; font-style: italic; color: var(--text-secondary); }

	.prompt-item { display: block; border: 1px solid var(--border-link); border-radius: var(--radius-card); margin-bottom: var(--space-6); transition: opacity 0.15s; }
	.prompt-item:hover { opacity: var(--opacity-hover-card); }
	/* .row-thumb, .thumb-img, .row-body, .row-title, .row-status — shared.css */
	.prompt-row { padding: var(--space-4); }
	.thumb-placeholder { position: absolute; inset: 0; background: var(--bg-control); }

	/* Feedback status */
	.feedback-status { margin-bottom: var(--space-6); padding: var(--space-4); border: 1px solid var(--border-link); border-radius: var(--radius-card); }
	.feedback-prompt { font-size: var(--text-md); font-weight: 500; margin: 0 0 var(--space-3); }
	.feedback-waiting { font-size: var(--text-sm); color: var(--text-muted); margin: 0; }

	/* Revealed feedback */
	.revealed-section { margin-bottom: var(--space-6); }
	.section-title { margin: 0 0 var(--space-4); }
	/* .reveal-card, .reveal-noshow, .reveal-quote, .reveal-tags, .reveal-tag — shared.css */

	.cancel-dialog {
		border: none;
		border-radius: var(--radius-card);
		padding: 0;
		max-width: 460px;
		width: calc(100% - var(--space-8));
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22);
	}
	.cancel-dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
	.cancel-inner { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }

	.cancel-title {
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		font-weight: normal;
		line-height: var(--leading-tight);
		margin: 0;
	}
	.cancel-when {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: calc(-1 * var(--space-2)) 0 0;
	}
	.cancel-body {
		font-size: var(--text-base);
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}
	.cancel-body--late {
		color: var(--text-primary);
		border-left: 2px solid var(--color-danger);
		padding-left: var(--space-3);
	}

	.field { display: flex; flex-direction: column; gap: var(--space-1); }
	.field label { font-size: var(--text-sm); color: var(--text-muted); }
	.field textarea {
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		resize: vertical;
		line-height: 1.6;
		width: 100%;
		box-sizing: border-box;
		font-family: inherit;
	}
	.field textarea:focus { outline: none; border-color: var(--text-muted); }
	.field textarea::placeholder { color: var(--text-muted); font-style: italic; }
	.field-error { font-size: var(--text-sm); color: var(--color-danger); margin: 0; }

	.cancel-actions { display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-2); }

	/* .btn-secondary / .btn-danger / .btn-danger--soft live in shared.css */

	.field-error-ref { display: block; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); }

	/* Report-a-problem dialog — mirrors the cancel dialog chrome. */
	.report-dialog {
		border: none;
		border-radius: var(--radius-card);
		padding: 0;
		max-width: 460px;
		width: calc(100% - var(--space-8));
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22);
	}
	.report-dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
	.report-inner { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
	.report-title {
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		font-weight: normal;
		line-height: var(--leading-tight);
		margin: 0;
	}
	.report-body {
		font-size: var(--text-base);
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}
	.report-success {
		padding: var(--space-8) var(--space-6);
		text-align: center;
		font-size: var(--text-md);
		color: var(--text-primary);
	}
</style>
