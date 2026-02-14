<footer class="site-footer">
	<p class="footer-copy">&copy; Monad Engineering, {new Date().getFullYear()}</p>
	<div class="footer-links">
		<a href="/impressum">Legal Notice</a>
		<a href="/datenschutz">Privacy Policy</a>
	</div>
</footer>

<style>
	.site-footer {
		padding: 32px 24px 24px;
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 13px;
		color: var(--text-muted, #999);
		text-align: center;
	}

	.footer-copy {
		margin: 0 0 8px;
		color: var(--text-muted, #999);
	}

	.footer-links {
		display: flex;
		justify-content: center;
		gap: 16px;
	}

	.footer-links a {
		color: var(--text-muted, #999);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.2s ease;
	}

	.footer-links a:hover {
		color: var(--text-secondary, #666);
	}
</style>
