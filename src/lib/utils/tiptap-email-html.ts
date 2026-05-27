import type { JSONContent } from '@tiptap/core';
import { escapeHtml } from './escape-html.js';

const FF = "'SangBleu Sunrise', Georgia, serif";

const FONT_FACES = `@font-face{font-family:'SangBleu Sunrise';src:url('https://dyad.berlin/fonts/SangBleuSunrise-Regular-WebXL.woff2') format('woff2');font-weight:400;font-style:normal;}
@font-face{font-family:'SangBleu Sunrise';src:url('https://dyad.berlin/fonts/SangBleuSunrise-Medium-WebXL.woff2') format('woff2');font-weight:500;font-style:normal;}
@font-face{font-family:'SangBleu Sunrise';src:url('https://dyad.berlin/fonts/SangBleuSunrise-Bold-WebXL.woff2') format('woff2');font-weight:700;font-style:normal;}`;

export const INVITE_EXPIRY_DAYS = 14;

type Mark = { type: string; attrs?: Record<string, unknown> };

function applyMarks(text: string, marks?: Mark[]): string {
	if (!marks || marks.length === 0) return text;
	return marks.reduce((acc, mark) => {
		switch (mark.type) {
			case 'bold':
				return `<strong>${acc}</strong>`;
			case 'italic':
				return `<em>${acc}</em>`;
			case 'link': {
				const href = escapeHtml(String(mark.attrs?.href ?? '#'));
				return `<a href="${href}" style="color:#1a1a1a;text-decoration:underline;">${acc}</a>`;
			}
			default:
				return acc;
		}
	}, text);
}

function renderChildren(nodes?: JSONContent[]): string {
	return (nodes ?? []).map(renderNode).join('');
}

function renderNode(node: JSONContent): string {
	switch (node.type) {
		case 'doc':
			return renderChildren(node.content);
		case 'paragraph': {
			const inner = renderChildren(node.content);
			return `<p style="font-family:${FF};margin:0 0 1em;line-height:1.7;">${inner || '&#8203;'}</p>`;
		}
		case 'heading': {
			const l = (node.attrs?.level as number) ?? 1;
			const inner = renderChildren(node.content);
			const sz = l === 1 ? '26px' : l === 2 ? '20px' : '17px';
			return `<h${l} style="font-family:${FF};font-size:${sz};font-weight:500;margin:1.2em 0 0.5em;line-height:1.3;">${inner}</h${l}>`;
		}
		case 'text':
			return applyMarks(escapeHtml(node.text ?? ''), node.marks);
		case 'hardBreak':
			return '<br>';
		case 'image': {
			const src = escapeHtml(String(node.attrs?.src ?? ''));
			const alt = escapeHtml(String(node.attrs?.alt ?? ''));
			return `<img src="${src}" alt="${alt}" style="max-width:100%;display:block;margin:1em 0;border-radius:4px;">`;
		}
		case 'bulletList':
			return `<ul style="font-family:${FF};margin:0 0 1em;padding-left:1.5em;line-height:1.7;">${renderChildren(node.content)}</ul>`;
		case 'orderedList':
			return `<ol style="font-family:${FF};margin:0 0 1em;padding-left:1.5em;line-height:1.7;">${renderChildren(node.content)}</ol>`;
		case 'listItem':
			return `<li style="margin-bottom:0.25em;">${renderChildren(node.content)}</li>`;
		case 'blockquote':
			return `<blockquote style="font-family:${FF};margin:0 0 1em;padding:12px 16px;background:#f7f4ee;border-left:3px solid #c8c2b6;font-style:italic;color:#3a3a3a;">${renderChildren(node.content)}</blockquote>`;
		case 'horizontalRule':
			return '<hr style="border:none;border-top:1px solid #e0ddd8;margin:1.5em 0;">';
		default:
			return '';
	}
}

/** Convert TipTap JSON to email-safe HTML with inline styles. */
export function renderTiptapToEmailHtml(content: JSONContent | null | undefined): string {
	if (!content || typeof content !== 'object') return '';
	const safe =
		content.type === 'doc' ? content : { type: 'doc', content: [{ type: 'paragraph' }] };
	try {
		return renderNode(safe);
	} catch {
		return '';
	}
}

/** Wrap body HTML in the email shell (Sangbleu font, max-width, Join dyad button, footer). */
export function buildInviteEmailHtml(params: {
	bodyHtml: string;
	inviteUrl: string;
	expiryDays: number;
}): string {
	const { bodyHtml, inviteUrl, expiryDays } = params;
	return `<style>${FONT_FACES}</style>
<div style="font-family:${FF};max-width:520px;margin:0 auto;padding:40px 20px;color:#1a1a1a;line-height:1.7;">
${bodyHtml}
<p style="font-family:${FF};margin:0 0 16px;"><a href="${inviteUrl}" style="font-family:${FF};color:#1a1a1a;font-weight:bold;text-decoration:underline;">Join dyad</a></p>
<p style="font-family:${FF};font-size:14px;color:#666;margin:0;">This link expires in ${expiryDays} days.</p>
<hr style="border:none;border-top:1px solid #e0ddd8;margin:32px 0 16px;"/>
<a href="https://dyad.berlin" style="display:inline-block;"><img src="https://dyad.berlin/images/logo-dark.png" alt="dyad" style="height:32px;width:auto;margin-bottom:8px;"/></a>
<p style="font-family:${FF};font-size:12px;color:#999;margin:0;">cultivating a culture of conversation</p>
</div>`;
}

/** Full HTML document for iframe preview (uses placeholder invite URL). */
export function buildPreviewDocument(params: {
	bodyHtml: string;
	expiryDays?: number;
}): string {
	const shell = buildInviteEmailHtml({
		bodyHtml: params.bodyHtml,
		inviteUrl: '#',
		expiryDays: params.expiryDays ?? INVITE_EXPIRY_DAYS
	});
	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff;">${shell}</body></html>`;
}
