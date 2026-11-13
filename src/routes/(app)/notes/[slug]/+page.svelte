<script>
	import 'katex/dist/katex.min.css';

	let { data } = $props();
	const Content = $derived(data.content);

	/** @type {HTMLDivElement} */ let prose = $state(/** @type {any} */ (null));
	/** @type {HTMLDialogElement} */ let dialog = $state(/** @type {any} */ (null));
	let zoomed = $state({ src: '', alt: '' });

	const PHOTO_H = 300; // px; a line of photos is never taller than this
	const GAP = 14; // px, matches the row gap in the styles

	// Each line of photos is sized from the photos' shapes: in a row each grows in proportion to
	// its width, and the line is capped at the width that makes it PHOTO_H tall. Nothing is cropped.
	// Every photo can also be opened full size, by click or keyboard.
	$effect(() => {
		void data.content;
		for (const line of prose.querySelectorAll('p:has(> img)')) {
			const imgs = [...line.querySelectorAll(':scope > img')].filter(
				(el) => el instanceof HTMLImageElement
			);
			const fit = () => {
				if (!imgs.every((img) => img.naturalWidth)) return;
				const ratios = imgs.map((img) => img.naturalWidth / img.naturalHeight);
				if (imgs.length > 1) imgs.forEach((img, i) => (img.style.flex = String(ratios[i])));
				const sum = ratios.reduce((a, b) => a + b, 0);
				/** @type {HTMLElement} */ (line).style.maxWidth = `${PHOTO_H * sum + GAP * (imgs.length - 1)}px`;
			};
			for (const img of imgs) {
				img.tabIndex = 0;
				if (!img.complete) img.addEventListener('load', fit, { once: true });
			}
			fit();
		}
	});

	/** @param {Event} e */
	function zoom(e) {
		const img = e.target;
		if (!(img instanceof HTMLImageElement)) return;
		if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		zoomed = { src: img.currentSrc || img.src, alt: img.alt };
		dialog.showModal();
	}
</script>

<svelte:head>
	<title>{data.meta.title} — Motti</title>
	{#if data.meta.description}<meta name="description" content={data.meta.description} />{/if}
</svelte:head>

<article class="post">
	<header>
		<h1>{data.meta.title}</h1>
		<time>{new Date(data.meta.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time>
	</header>

	<!-- The images inside are the interactive elements; they're made focusable above. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="prose" bind:this={prose} onclick={zoom} onkeydown={zoom}>
		<Content />
	</div>
</article>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog class="zoom" bind:this={dialog} onclick={() => dialog.close()} aria-label={zoomed.alt}>
	<img src={zoomed.src} alt={zoomed.alt} />
</dialog>

<style>
	.post {
		max-width: 780px;
		width: 100%;
		padding: 2.5rem 0 4rem;
	}

	header {
		margin-bottom: 3rem;
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

	.prose {
		font-size: 1.05rem;
		line-height: 1.85;
	}

	.prose :global(p) {
		margin-bottom: 1.4em;
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

	/* Photos sit on the page like prints: lifted, and they open full size when clicked. */
	.prose :global(img) {
		display: block;
		max-width: 100%;
		border-radius: 8px;
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.45);
		cursor: zoom-in;
		transition: transform 0.25s ease, box-shadow 0.25s ease;
	}

	@media (prefers-reduced-motion: no-preference) {
		.prose :global(img:hover) {
			transform: translateY(-4px) rotate(-0.4deg);
			box-shadow: 0 16px 40px rgb(0 0 0 / 0.55);
		}
	}

	.prose :global(img:focus-visible) {
		outline: 2px solid var(--muted);
		outline-offset: 4px;
	}

	/* A line of photos, centred; the script caps its width so it's at most PHOTO_H tall. */
	.prose :global(p:has(> img)) {
		margin: 2rem auto;
	}

	.prose :global(p:has(> img) img) {
		width: 100%;
	}

	/* Several markdown images on one line become a row, one height, nothing cropped. */
	.prose :global(p:has(> img + img)) {
		display: flex;
		align-items: flex-start;
		gap: 14px;
	}

	.prose :global(p:has(> img + img) img) {
		flex: 1;
		min-width: 0;
	}

	.zoom {
		margin: auto;
		padding: 0;
		border: none;
		background: none;
		max-width: 94vw;
		max-height: 92vh;
		overflow: visible;
		cursor: zoom-out;
	}

	.zoom::backdrop {
		background: rgb(10 10 10 / 0.85);
		backdrop-filter: blur(4px);
	}

	.zoom img {
		display: block;
		max-width: 94vw;
		max-height: 92vh;
		border-radius: 8px;
		box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
	}

	@media (prefers-reduced-motion: no-preference) {
		.zoom[open] img {
			animation: pop 0.22s ease-out;
		}
	}

	@keyframes pop {
		from {
			transform: scale(0.94);
			opacity: 0;
		}
	}

	/* Design tokens consumed by in-post widgets; each widget falls back to its own
	   defaults when these are unset. */
	.prose {
		--surface-1: #16161a;
		--page: var(--bg);
		--text-primary: var(--heading);
		--text-secondary: var(--text);
		--grid: #2a2a33;
		--axis: #40404d;
		--series-1: #6ba7f5;
		--series-2: #e2703c;
		--series-3: #35c08a;
		--series-4: #d9a01c;
		--good: #35c08a;
	}

	.prose :global(table) {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.9rem;
		margin: 1.2rem 0;
	}

	.prose :global(th),
	.prose :global(td) {
		text-align: right;
		padding: 7px 10px;
		border-bottom: 1px solid var(--border);
	}

	.prose :global(th:first-child),
	.prose :global(td:first-child) {
		text-align: left;
	}

	.prose :global(th) {
		color: var(--muted);
		font-weight: 600;
		font-size: 0.82rem;
	}

	.prose :global(tbody tr:last-child td) {
		border-bottom: none;
	}

	.prose :global(p.note) {
		color: var(--muted);
		font-size: 0.82rem;
		line-height: 1.5;
		margin-top: -0.6rem;
	}

	.prose :global(details) {
		margin: 1.6rem 0;
		font-size: 0.9rem;
	}

	.prose :global(summary) {
		cursor: pointer;
		color: var(--muted);
	}

	/* long display equations should scroll rather than blow out the column */
	.prose :global(.katex-display) {
		overflow-x: auto;
		overflow-y: hidden;
		padding: 0.2rem 0;
	}
</style>
