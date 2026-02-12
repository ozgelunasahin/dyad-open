<footer class="site-footer">
	<div class="footer-inner">
		<div class="footer-left">
			<span class="footer-company">Monad Engineering UG (haftungsbeschr&auml;nkt)</span>
			<span class="footer-city">Berlin</span>
		</div>
		<div class="footer-right">
			<a href="/impressum">Impressum</a>
			<a href="/datenschutz">Datenschutz</a>
		</div>
	</div>
	<p class="footer-copy">&copy; {new Date().getFullYear()}</p>
</footer>

<style>
	.site-footer {
		padding: 32px 24px 24px;
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		border-top: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
	}

	.footer-inner {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 24px;
	}

	.footer-left {
		display: flex;
		gap: 16px;
		align-items: baseline;
	}

	.footer-company {
		color: var(--text-secondary, #333);
	}

	.footer-right {
		display: flex;
		gap: 16px;
	}

	.footer-right a {
		color: var(--text-muted, #666);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.footer-right a:hover {
		color: var(--text-primary, #1a1a1a);
	}

	.footer-copy {
		margin: 12px 0 0;
		font-size: 12px;
		color: var(--text-muted, #666);
		opacity: 0.6;
	}

	@media (max-width: 768px) {
		.site-footer {
			padding: 24px 14px 20px;
		}

		.footer-inner {
			flex-direction: column;
			gap: 12px;
		}

		.footer-left {
			flex-direction: column;
			gap: 4px;
		}
	}
</style>
