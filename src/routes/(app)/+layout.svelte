<script>
	let { data, children } = $props();
</script>

<svelte:head>
	<title>Motti</title>
</svelte:head>

<nav>
	<a href="/">home</a>
	<a href="/about">about</a>
	{#if data.hasBlogPosts}
		<a href="/blog">blog</a>
	{/if}
</nav>

<main>
	{@render children()}
</main>

<style>
	nav {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		padding: 1.2rem 1rem;
	}

	nav a {
		color: var(--muted);
		font-size: 0.9rem;
		letter-spacing: 0.05em;
		transition: color 0.2s;
	}

	nav a:hover {
		color: var(--fg);
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		padding-bottom: calc(1rem + 3.4rem);
	}
</style>
