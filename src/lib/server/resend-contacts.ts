import { env } from '$env/dynamic/private';

export type ContactStage = 'waitlist' | 'invited' | 'member';

const AUDIENCE_IDS: Record<ContactStage, string> = {
	waitlist: 'd77c7fdc-1413-4e8e-9381-8116f420a0e4',
	invited:  '01e6914a-e7b6-4548-bac2-c885724cbc4a',
	member:   'dff3a185-885f-42f5-be88-c714a58b71bf',
};

/**
 * Add a contact to the appropriate Resend audience.
 * Fire-and-forget safe — logs on failure but never throws.
 * No-ops in local dev (EMAIL_PROVIDER !== 'resend').
 */
export async function addToAudience(
	stage: ContactStage,
	contact: { email: string; firstName?: string }
): Promise<void> {
	if ((env.EMAIL_PROVIDER ?? 'mailpit') !== 'resend') return;

	const apiKey = env.RESEND_API_KEY;
	if (!apiKey) return;

	const audienceId = AUDIENCE_IDS[stage];

	try {
		const body: Record<string, unknown> = { email: contact.email, unsubscribed: false };
		if (contact.firstName) body.first_name = contact.firstName;

		const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			console.error(`[resend-contacts] Failed to add ${contact.email} to ${stage}:`, res.status, await res.text());
		}
	} catch (err) {
		console.error(`[resend-contacts] Error adding ${contact.email} to ${stage}:`, err);
	}
}
