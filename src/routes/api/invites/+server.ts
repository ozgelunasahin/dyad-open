import { json, error } from '@sveltejs/kit';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { nanoid } from 'nanoid';
import type { RequestHandler } from './$types';

const INVITE_EXPIRY_DAYS = 14;

async function requireAdmin(locals: App.Locals) {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('can_publish_sites')
		.eq('id', locals.user.id)
		.single();

	if (!profile?.can_publish_sites) {
		error(403, 'Admin access required');
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireAdmin(locals);

	const body = await request.json();
	const { email, name } = body;

	if (!email || typeof email !== 'string') {
		error(400, 'Email is required');
	}

	// Check if this email already has an unused, non-expired invitation
	const { data: existing } = await locals.supabase
		.from('invitations')
		.select('id, token, expires_at, used_at')
		.eq('email', email.trim())
		.is('used_at', null)
		.gt('expires_at', new Date().toISOString())
		.limit(1);

	if (existing && existing.length > 0) {
		// Already has a valid invite — return the existing link
		const origin = request.headers.get('origin') || 'https://dyad.berlin';
		return json({
			ok: true,
			alreadyInvited: true,
			inviteUrl: `${origin}/join?token=${existing[0].token}`
		});
	}

	// Check if this email is already a registered user
	// (We can check if an invitation was already used)
	const { data: usedInvite } = await locals.supabase
		.from('invitations')
		.select('id')
		.eq('email', email.trim())
		.not('used_at', 'is', null)
		.limit(1);

	if (usedInvite && usedInvite.length > 0) {
		return json({ error: 'This person has already signed up.' }, { status: 409 });
	}

	// Generate new invitation
	const token = nanoid();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

	const { error: dbError } = await locals.supabase
		.from('invitations')
		.insert({
			email: email.trim(),
			token,
			expires_at: expiresAt.toISOString()
		});

	if (dbError) {
		console.error('Failed to create invitation:', dbError);
		error(500, 'Failed to create invitation');
	}

	const origin = request.headers.get('origin') || 'https://dyad.berlin';
	const inviteUrl = `${origin}/join?token=${token}`;

	// Send invite email
	const displayName = (typeof name === 'string' && name.trim()) || 'there';
	if (env.RESEND_API_KEY) {
		const resend = new Resend(env.RESEND_API_KEY);
		resend.emails.send({
		from: 'dyad. <hello@dyad.berlin>',
		to: email.trim(),
		subject: "You're invited to dyad.",
		html: `
			<div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.7;">
				<p>Hi ${displayName},</p>
				<p>You've been invited to join dyad — a community of independent thinkers who meet through writing.</p>
				<p>Your invitation link:</p>
				<p><a href="${inviteUrl}" style="color: #1a1a1a; font-weight: bold;">${inviteUrl}</a></p>
				<p style="font-size: 14px; color: #666;">This link expires in ${INVITE_EXPIRY_DAYS} days.</p>
				<hr style="border: none; border-top: 1px solid #e0ddd8; margin: 32px 0 16px;" />
				<p style="font-size: 12px; color: #999;">dyad.berlin — cultivating a culture of conversation</p>
			</div>
		`
		}).catch(err => console.error('Failed to send invite email:', err));
	}

	return json({ ok: true, inviteUrl });
};
