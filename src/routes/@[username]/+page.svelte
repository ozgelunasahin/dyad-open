<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let following = $state(data.isFollowing);
	let followerCount = $state(data.followerCount);

	async function toggleFollow() {
		if (!data.currentUserId) return;
		const prev = following;
		following = !following;
		followerCount += following ? 1 : -1;
		try {
			const res = await fetch('/api/follows', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ following_id: data.profile.id })
			});
			if (res.ok) {
				const { following: confirmed } = await res.json();
				if (confirmed !== following) {
					followerCount += confirmed ? 1 : -1;
					following = confirmed;
				}
			} else {
				following = prev;
				followerCount += prev ? 1 : -1;
			}
		} catch {
			following = prev;
			followerCount += prev ? 1 : -1;
		}
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>@{data.profile.username} — dyad.berlin</title>
</svelte:head>

<div class="profile-page">
	<nav class="top-nav">
		<a href="/discover" class="nav-logo">
			<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt="dyad" class="logo-img" />
		</a>
		<div class="nav-right">
			{#if data.currentUserId}
				<a href="/dashboard" class="nav-link">Profile</a>
				<a href="/logout" class="nav-link muted">Sign out</a>
			{:else}
				<a href="/login" class="nav-link">Log in</a>
			{/if}
		</div>
	</nav>

	<div class="profile-content">
		<div class="profile-header">
			<div class="profile-identity">
				<h1 class="profile-username">@{data.profile.username}</h1>
				<p class="profile-joined">Member since {formatDate(data.profile.joinedAt)}</p>
			</div>
			<div class="profile-stats">
				<span class="stat"><strong>{followerCount}</strong> followers</span>
				<span class="stat"><strong>{data.followingCount}</strong> following</span>
			</div>
			{#if !data.isOwn && data.currentUserId}
				<button
					class="follow-btn"
					class:active={following}
					onclick={toggleFollow}
				>
					{following ? 'Following' : 'Follow'}
				</button>
			{:else if data.isOwn}
				<a href="/dashboard" class="edit-profile-link">Edit profile</a>
			{/if}
		</div>

		<div class="conversations-section">
			<h2 class="section-label">Conversations</h2>
			{#if data.conversations.length === 0}
				<p class="empty">No conversations published yet.</p>
			{:else}
				<div class="conversation-list">
					{#each data.conversations as convo}
						<a href="/@{data.profile.username}/{convo.slug}" class="convo-row">
							<div class="convo-thumb">
								{#if convo.coverImageUrl}
									<img src={convo.coverImageUrl} alt="" class="thumb-img" />
								{:else}
									<div class="thumb-placeholder"></div>
								{/if}
							</div>
							<div class="convo-body">
								<h3 class="convo-title">{convo.name}</h3>
								<span class="convo-date">{formatDate(convo.updatedAt)}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.profile-page {
		min-height: 100vh;
		background: var(--bg-canvas, #f5f4f0);
	}

	.top-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.1));
	}

	.logo-img {
		width: 22px;
		height: auto;
		filter: brightness(0) opacity(0.4);
	}

	:global([data-theme='dark']) .logo-img {
		filter: brightness(0) invert(1) opacity(0.7);
	}

	.nav-right {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.nav-link {
		font-size: 0.9rem;
		color: var(--text-muted, #888);
		text-decoration: none;
	}

	.nav-link:hover { color: var(--text-primary, #1a1a1a); }
	.nav-link.muted { color: var(--text-muted, #aaa); }

	.profile-content {
		max-width: 680px;
		margin: 0 auto;
		padding: 3rem 2rem 5rem;
	}

	.profile-header {
		margin-bottom: 3rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.profile-identity {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.profile-username {
		font-size: 1.5rem;
		font-weight: 500;
		margin: 0;
		color: var(--text-primary, #1a1a1a);
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
	}

	.profile-joined {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-muted, #888);
	}

	.profile-stats {
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		font-size: 0.9rem;
		color: var(--text-muted, #888);
	}

	.stat strong {
		color: var(--text-primary, #1a1a1a);
	}

	.follow-btn {
		align-self: flex-start;
		padding: 0.5rem 1.25rem;
		border-radius: 20px;
		border: 1px solid var(--border-link, rgba(0,0,0,0.2));
		background: none;
		font-size: 0.9rem;
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.follow-btn:hover {
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-primary, #fff);
		border-color: var(--text-primary, #1a1a1a);
	}

	.follow-btn.active {
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-primary, #fff);
		border-color: var(--text-primary, #1a1a1a);
	}

	.edit-profile-link {
		align-self: flex-start;
		font-size: 0.9rem;
		color: var(--text-muted, #888);
		text-decoration: none;
		border: 1px solid var(--border-link, rgba(0,0,0,0.15));
		border-radius: 20px;
		padding: 0.5rem 1.25rem;
	}

	.edit-profile-link:hover { color: var(--text-primary, #1a1a1a); }

	.section-label {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted, #888);
		margin: 0 0 1.25rem;
	}

	.empty {
		color: var(--text-muted, #888);
		font-size: 0.95rem;
	}

	.conversation-list {
		display: flex;
		flex-direction: column;
	}

	.convo-row {
		display: flex;
		gap: 1.25rem;
		padding: 1.25rem 0;
		border-top: 1px solid var(--border-link, rgba(0,0,0,0.08));
		text-decoration: none;
		align-items: stretch;
	}

	.convo-row:last-child { border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.08)); }
	.convo-row:hover .convo-title { opacity: 0.7; }

	.convo-thumb {
		position: relative;
		flex-shrink: 0;
		width: 72px;
		min-height: 60px;
		border-radius: 4px;
		overflow: hidden;
		align-self: stretch;
	}

	.thumb-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumb-placeholder {
		position: absolute;
		inset: 0;
		background: var(--bg-control, rgba(0,0,0,0.05));
	}

	.convo-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		justify-content: center;
	}

	.convo-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		transition: opacity 0.15s;
	}

	.convo-date {
		font-size: 0.8rem;
		color: var(--text-muted, #888);
	}
</style>
