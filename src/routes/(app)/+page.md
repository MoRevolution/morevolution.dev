---
title: Home
---

<script>
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import StiltsEgg from '$lib/components/StiltsEgg.svelte';
	import { page } from '$app/state';

	let pic = $state(null);
	let egg = $state();
</script>

<svelte:head>
	<title>Motti</title>
</svelte:head>

<div class="home">
	<button class="egg-btn" aria-label="Poke Eric" onclick={() => egg?.play()}><img bind:this={pic} src="/img/Eric.png" alt="Motti's profile picture" class="profile-pic" /></button>
	<StiltsEgg bind:this={egg} {pic} />

	# Hi there, I'm Motti 👋

	🎓 Grad student @ [WashU](https://www.google.com/search?q=washu) | Infra & Tools @ Deere 

	<SocialLinks />

	<nav class="next">
		<a href="/about">more about me <span class="arrow">→</span></a>
		{#if page.data.latestNote}
			<a href="/notes/{page.data.latestNote.slug}"><span class="tag">latest note</span> {page.data.latestNote.title} <span class="arrow">→</span></a>
		{/if}
	</nav>
</div>

<style>
	.home {
		max-width: 1080px;
		text-align: center;
	}

	/* Inherit the surrounding font so the button's line box matches the bare img it replaced. */
	.egg-btn {
		all: unset;
		font: inherit;
		cursor: pointer;
		border-radius: 50%;
	}

	.egg-btn:focus-visible {
		outline: 2px solid var(--muted);
		outline-offset: 4px;
	}

	.profile-pic {
		width: 140px;
		height: 140px;
		border-radius: 50%;
		margin-bottom: 1.5rem;
		object-fit: cover;
	}

	/* A little wiggle on hover, so it's clear he can be poked. */
	@media (prefers-reduced-motion: no-preference) {
		.egg-btn:hover .profile-pic {
			animation: wiggle 0.5s ease-in-out;
		}
	}

	@keyframes wiggle {
		25% {
			rotate: -6deg;
		}
		60% {
			rotate: 4deg;
		}
	}

	.next {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		margin-top: 2.25rem;
		font-size: 0.85rem;
	}

	.next a {
		color: var(--muted);
	}

	.next a:hover {
		color: var(--link-hover);
	}

	.arrow {
		display: inline-block;
		transition: translate 0.2s ease;
	}

	.next a:hover .arrow {
		translate: 4px 0;
	}

	/* One small nudge after the wave, so the way onward gets noticed. */
	@media (prefers-reduced-motion: no-preference) {
		.next a:first-child .arrow {
			animation: nudge 0.5s ease-in-out 2.6s 2;
		}
	}

	@keyframes nudge {
		50% {
			translate: 5px 0;
		}
	}

	.tag {
		margin-right: 0.5rem;
		padding: 0.15rem 0.45rem;
		border: 1px solid #3d3d47;
		border-radius: 4px;
		font-size: 0.75rem;
		letter-spacing: 0.05em;
	}

	.home :global(h1) {
		color: var(--heading);
		margin-bottom: 0.75rem;
	}

	.home :global(p) {
		font-size: 1.1rem;
		margin-bottom: 1.25rem;
	}

	.home :global(p a) {
		color: var(--text);
		text-decoration: none;
		transition: color 0.3s;
	}

	.home :global(p a:hover) {
		color: var(--link-hover);
		text-decoration: underline;
	}
</style>
