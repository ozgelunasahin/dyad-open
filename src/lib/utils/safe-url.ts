/**
 * Allowlist of URL forms permitted in user-rendered content. Matches:
 *   - http:// or https:// with anything following
 *   - mailto: with anything following
 *   - root-relative paths starting with `/`, except protocol-relative `//host`
 *
 * The `(?!\/)` negative lookahead on the relative-path branch rejects
 * `//evil.com`, which would otherwise inherit the page protocol on the
 * client and act as a fully-qualified link to an attacker-controlled host.
 *
 * Used by both the write-side validator (`validate-tiptap-content.ts`) and
 * the read-side renderer (`tiptap-html.ts`) so the two gates cannot drift
 * into accepting different URL shapes.
 */
export const SAFE_URL_PROTOCOL = /^(https?:\/\/|mailto:|\/(?!\/))/i;
