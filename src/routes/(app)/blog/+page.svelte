<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Blog — Motti</title>
</svelte:head>

<div class="blog-index">
	<h1>Blog</h1>

	{#if data.posts.length === 0}
		<p class="empty">Nothing here yet — check back soon.</p>
	{:else}
		<ul>
			{#each data.posts as post}
				<li>
					<a href="/blog/{post.slug}">
						<span class="post-title">{post.title}</span>
						<span class="post-date">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.blog-index {
		max-width: 640px;
		width: 100%;
	}

	h1 {
		color: var(--heading);
		margin-bottom: 1.5rem;
	}

	.empty {
		color: var(--muted);
	}

	ul {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	li a {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.6rem 0.8rem;
		border-radius: 6px;
		transition: background-color 0.2s;
		gap: 1rem;
	}

	li a:hover {
		background-color: var(--nav-hover);
		color: var(--fg);
	}

	.post-title {
		font-size: 1.05rem;
	}

	.post-date {
		font-size: 0.85rem;
		color: var(--muted);
		white-space: nowrap;
	}
</style>
