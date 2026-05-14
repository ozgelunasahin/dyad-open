import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tokens } from './design-tokens.js';

const appCssPath = fileURLToPath(new URL('../app.css', import.meta.url));
const appCss = readFileSync(appCssPath, 'utf8');

// Tokens are declared in both `:root` (light) and `[data-theme='dark']`.
// Match against the :root block only so dark-mode reordering can't silently
// flip which declaration the test verifies.
const rootBlockMatch = appCss.match(/:root\s*\{([\s\S]*?)\n\}/);
if (!rootBlockMatch) throw new Error(':root block not found in src/app.css');
const rootBlock = rootBlockMatch[1];

function readToken(name: string): string {
	const match = rootBlock.match(new RegExp(`--${name}:\\s*([^;]+);`));
	if (!match) throw new Error(`Token --${name} not found in src/app.css :root`);
	return match[1].trim();
}

describe('design-tokens — sync with src/app.css', () => {
	it('color tokens match the :root declarations', () => {
		expect(tokens.color.textPrimary).toBe(readToken('text-primary'));
		expect(tokens.color.textSecondary).toBe(readToken('text-secondary'));
		expect(tokens.color.textMuted).toBe(readToken('text-muted'));
		expect(tokens.color.borderSubtle).toBe(readToken('border-subtle'));
	});

	it('text-size tokens match the :root declarations', () => {
		// CSS tokens are rem; the TS mirror uses px for email contexts
		// where rem inheritance is unreliable. Conversions assume 16px root.
		expect(tokens.textSize.xs).toBe('11px'); // 0.6875rem
		expect(tokens.textSize.base).toBe('14px'); // 0.875rem
		expect(tokens.textSize.lg).toBe('16px'); // 1rem
		// Sanity: confirm the rem source is what we think it is
		expect(readToken('text-xs')).toContain('0.6875rem');
		expect(readToken('text-base')).toContain('0.875rem');
		expect(readToken('text-lg')).toContain('1rem');
	});

	it('spacing tokens match the :root declarations', () => {
		expect(tokens.space[1]).toBe(readToken('space-1'));
		expect(tokens.space[2]).toBe(readToken('space-2'));
		expect(tokens.space[3]).toBe(readToken('space-3'));
		expect(tokens.space[4]).toBe(readToken('space-4'));
		expect(tokens.space[5]).toBe(readToken('space-5'));
		expect(tokens.space[6]).toBe(readToken('space-6'));
		expect(tokens.space[8]).toBe(readToken('space-8'));
	});

	it('leading tokens match the :root declarations', () => {
		expect(tokens.leading.tight).toBe(readToken('leading-tight'));
		expect(tokens.leading.normal).toBe(readToken('leading-normal'));
		expect(tokens.leading.relaxed).toBe(readToken('leading-relaxed'));
	});
});
