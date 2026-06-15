import type { JSONContent } from '@tiptap/core';
import { renderTiptapToHtml } from './tiptap-html.js';

/**
 * Render a TipTap JSON document into email-safe HTML.
 *
 * Reuses the shared sanitizing renderer (protocol allowlist, escaped text)
 * and is the single entry point used by the invite composer preview and the
 * email send path.
 */
export function renderTiptapToEmailHtml(content: JSONContent | null | undefined): string {
	return renderTiptapToHtml(content);
}

/**
 * Wrap rendered body HTML in a minimal, self-contained document for preview.
 * Inline styles only — no external stylesheet — so it renders consistently in
 * the composer iframe/preview and approximates an email client.
 */
export function buildPreviewDocument({ bodyHtml }: { bodyHtml: string }): string {
	return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.5; color: #1a1a1a;">${bodyHtml}</div>`;
}
