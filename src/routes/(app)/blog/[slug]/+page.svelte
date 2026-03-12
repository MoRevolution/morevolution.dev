<script>
	let { data } = $props();
	const Content = $derived(data.content);
</script>

<svelte:head>
	<title>{data.meta.title} — Motti</title>
</svelte:head>

<article class="post">
	<header>
		<h1>{data.meta.title}</h1>
		<time>{new Date(data.meta.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
	</header>

	<div class="prose">
		<Content />
	</div>
</article>

<style>
	.post {
		max-width: 640px;
		width: 100%;
	}

	header {
		margin-bottom: 2rem;
	}

	h1 {
		color: var(--heading);
		margin-bottom: 0.5rem;
	}

	time {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.prose :global(h2) {
		color: var(--heading);
		margin-top: 2rem;
		margin-bottom: 0.75rem;
	}

	.prose :global(h3) {
		color: var(--heading);
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.prose :global(p) {
		font-size: 1.05rem;
		line-height: 1.7;
		margin-bottom: 1rem;
	}

	.prose :global(a) {
		color: var(--text);
		text-decoration: underline;
		text-decoration-color: var(--muted);
		text-underline-offset: 3px;
		transition: text-decoration-color 0.2s, color 0.2s;
	}

	.prose :global(a:hover) {
		color: var(--link-hover);
		text-decoration-color: var(--link-hover);
	}

	.prose :global(code) {
		background: var(--border);
		padding: 0.15em 0.4em;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.prose :global(pre) {
		background: var(--border);
		padding: 1rem;
		border-radius: 6px;
		overflow-x: auto;
		margin-bottom: 1rem;
	}

	.prose :global(pre code) {
		background: none;
		padding: 0;
	}

	.prose :global(ul),
	.prose :global(ol) {
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}

	.prose :global(li) {
		margin-bottom: 0.3rem;
		line-height: 1.6;
	}

	.prose :global(blockquote) {
		border-left: 3px solid var(--muted);
		padding-left: 1rem;
		color: var(--muted);
		margin-bottom: 1rem;
	}

	.prose :global(img) {
		max-width: 100%;
		border-radius: 6px;
	}
</style>
