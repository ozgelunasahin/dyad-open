# Open Questions — Status After Co-Founder Sync

Updated 2026-03-24.

---

## Resolved

### 1. Can Sophie cancel a confirmed meeting?
**Decision:** Yes, cancellation is symmetric. Same tiers apply to both parties.

### 2. Is commenting part of the invitation, or separate?
**Decision:** Commenting is possible without inviting. One response per prompt, editable (with an "edited" indicator). No maximum to number of prompts a user can comment on without inviting — but track this metric. A comment is a single response to a starter, not a thread.

### 3. What does "12h cutoff" mean for unanswered invitations?
**Decision:** 12 hours before the meeting start time. Also: Sophie can accept invitations for multiple time slots (one per slot). Once an invitation is accepted for a time slot, that slot is no longer displayed to other users. Need to handle the race condition of near-simultaneous acceptances.

### 4. What happens when a user deletes their account mid-flow?
**Decision:** Account deletion releases the other party from feedback gate. Treated under the same cancellation rules (auto-generated cancellation message): no penalty if >=12h before meeting, reputation mark if <12h. The mark is associated with the user's email address. User profiles can be kept in database as soft-deleted with an appropriate personal data retention period. Credibility is built up over time, so deleting an account to avoid bad reputation isn't really viable.

### 5. What is a prompt's final state after a completed meeting?
**Decision:** Archived. Both Sophie and Tom can see it in their private profiles. They can choose to show feedback/info on their public profiles. Sophie can republish the prompt (with new time slots), whether or not a meeting happened.

### 6. Can Sophie unpublish a prompt voluntarily?
**Decision:** Yes. Active invitations are resolved according to the cancellation policy.

### 7. What happens when a time slot expires with a pending invitation on it?
**Decision:** Invitations expire if not responded to before 12 hours of the meeting time. Accepting is a single click, so the race condition between viewing and clicking is a non-issue.

### 8. Can a user have multiple meetings scheduled at the same time?
**Decision:** No. Time slots where the user already has an accepted meeting are hidden from view. **Follow-up needed:** A user could block many prompt slots by accepting invitations, then cancel just before the 12h window — blocking up to 6.5 days of availability for other potential inviters. This leans toward starters not accepting until they're really sure. They can receive many invitations for the same slot before choosing one. Accepting should be a full commitment. A response window may help. To be revisited based on usage. People need to be able to plan their lives.

### 9. Does the feedback gate activate mid-session?
**Decision:** Gated immediately when meeting start time passes.

### 10. What does the unsuccessful inviter see, and when?
**Decision:** A notification on the status of their invitation (updated in their profile, with opt-in notifications). Wording TBD.

### 11. What happens to other pending invitations when a cancelled meeting causes the prompt to reappear?
**Decision:** Largely circumvented by hiding booked time slots (only the accepted slot is hidden, others remain). See #8 follow-up for broader concerns.

### 12. Both parties report a no-show — what happens?
**Decision:** Triggers moderation.

### 13. 7-day window: from creation or rolling?
**Decision:** Rolling. Sophie keeps the prompt alive by opening new time slots. Without activity (no valid future time slots), the prompt is archived and requires re-publishing.

### 14. How free-form is the duration/time selection UI?
**Decision:** Preferred time slot (not availability block). Keep things simple. May be reviewed based on usage.

### 16. What rich text capabilities for prompts?
**Decision:** Confirmed — basic formatting via keyboard shortcuts. No toolbar, no modals.

### 18. Admin capabilities — what's the scope?
**Decision:** Yes to all. Admins can view everything. Users should assume admins can read anything they upload. No private content or confidential details are collected beyond what users agree to share with the platform.

### 19. How does the platform work with empty profiles?
**Decision:** No action needed. Fine as-is.

### 22. Feedback gate scope
**Updated decision:** Hard line — no access to the app at all until at least the minimum feedback is given. Multi-step gating (reducing friction while ensuring thoughtful feedback) is TBD for later, not now.

### 24. Pre-acceptance cancellation explanation
**Decision:** Withdrawing an invitation before it is accepted is a free action. No explanation required.

### 25. Re-publishing archived prompts
**Decision:** Sophie can republish a prompt whether or not a meeting happened. See #5.

---

## Still TBD

### 15. How do we verify regional presence (Berlin)?
No decision yet. All options have trade-offs.

### 17. Cover image moderation?
No decision yet.

### 20. What does "add to calendar" produce?
No decision yet.

### 26. Onboarding content
No decision yet. Must be organic, not tutorial modals.

### 27. Adjective vocabulary for feedback
No decision yet. Admin-curated starting set, evolved over time.

---

## Decided, Review Later Based on Usage

### 8 (follow-up). Slot-blocking and commitment timing
A user could accept invitations to block time slots across many prompts, then cancel before the 12h window. Starters should be deliberate about accepting. A response window may help. Revisit based on usage.

### 10 (follow-up). Notification wording for expired invitations
Wording TBD. Must avoid "rejection" framing.

### 21. Pending invitations when another is accepted
Remain unanswered until 12h cutoff. Revisit based on user experience.

### 22 (follow-up). Multi-step feedback gating
Hard line for now. Later: tune to reduce friction while ensuring thoughtful, authentic feedback.

### 23. Reputation mark specifics
Maybe 1 free pass. Exact thresholds, visual representation, per-type vs total — all TBD.
