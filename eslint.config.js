import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			// Relax for existing codebase — tighten over time
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'no-undef': 'off', // TypeScript handles this
			// Svelte plugin rules that flag standard SvelteKit patterns
			'svelte/no-at-html-tags': 'warn', // @html is used intentionally for TipTap content
			'svelte/require-each-key': 'off', // Not all lists need keys (static or short lists)
			'svelte/no-unused-svelte-ignore': 'off', // svelte-ignore comments from earlier Svelte versions
			'svelte/no-navigation-without-resolve': 'off', // goto() and <a href> are standard in SvelteKit
		}
	},
	{
		ignores: [
			'.svelte-kit/',
			'build/',
			'node_modules/',
			'static/',
			'supabase/',
			'*.config.js',
			'*.config.ts',
		]
	}
);
