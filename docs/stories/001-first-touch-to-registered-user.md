# Story 1: First Touch → Registered User

A visitor arrives on the landing page, requests to join, goes through an admin approval flow, and becomes a registered and onboarded user.

## Pools & Lanes

### Visitor/User

1. **Start Event** — Arrives on landing page
2. **Task** — Views landing page content (what it's about)
3. **Task** — Fills out join request form
4. **Task** — Receives confirmation email (wait state)
5. **Intermediate Message Event (catch)** — Receives decision update
6. **Exclusive Gateway** — Decision outcome?
   - *Denied* → **Task** — Receives rejection notice → **End Event**
   - *Hold* → **Task** — Receives "we'll be in touch" notice → **End Event** (for now)
   - *Accepted* → **Task** — Receives acceptance email with link
7. **Task** — Clicks invite link
8. **Task** — Picks username
9. **Task** — Arrives on onboarding page
10. **Task** — Completes onboarding
11. **End Event** — Registered & onboarded user → can access discover page (Stories 2/3)

### System

1. **Task** — Renders landing page
2. **Task** — Receives form submission
3. **Task** — Sends confirmation email to visitor
4. **Task** — Notifies admin of new request
5. **Intermediate Message Event (catch)** — Receives admin decision
6. **Task** — Sends decision email to user
7. **Task** — (If accepted) Generates invite link
8. **Task** — Creates account / sets username
9. **Task** — Serves onboarding flow
10. **Task** — Marks user as registered & onboarded

### Admin

1. **Intermediate Message Event (catch)** — Receives notification of new request
2. **Task** — Reviews request
3. **Exclusive Gateway** — Accept / Deny / Hold
4. **Task** — Submits decision → message to System

## Message Flows

- Visitor → System: Form submission
- System → Visitor: Confirmation email
- System → Admin: New request notification
- Admin → System: Decision (accept/deny/hold)
- System → Visitor: Decision email (with invite link if accepted)

## Resolved Decisions

- **Invite link**: Time-bound, but not single-use in the strict sense — it can only confirm one account, but if the user's session drops mid-registration they can use the same link to resume. Minimise friction for joining.
- **Admin hold/deny flows**: To be revisited later. Admin requirements differ from user requirements and we don't want to go too deep here yet.
- **Username**: Part of onboarding. Should not be given too much importance — users should be able to protect their anonymity.
- **Onboarding content**: TBD. Needs to induct users into the platform and its norms. Absolutely NOT a tutorial/guide with modals around the interface. The approach should be more organic.

## Open Questions

- **Regional verification**: How do we ensure the user is actually in Berlin (or the app's region)? All standard approaches have issues:
  - Official residence checks exclude people with complicated residence situations (common in Berlin)
  - Location data sharing conflicts with privacy principles
  - IP/VPN-based checks are unreliable and exclusionary
  - The problem is partly mitigated by only allowing meeting locations within Berlin — you'd only use the app if you can actually show up
  - Creative alternatives worth exploring: e.g. scan a QR code at a physical location in the city (a "treasure hunt" as lightweight proof of presence)
  - This needs a solution that balances trust, accessibility, and privacy
