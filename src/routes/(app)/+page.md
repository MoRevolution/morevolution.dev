---
title: Home
---

<script>
	import SocialLinks from '$lib/components/SocialLinks.svelte';
</script>

<svelte:head>
	<title>Motti</title>
</svelte:head>

<div class="home">
	<img src="/img/Eric.png" alt="Motti's profile picture" class="profile-pic" />

	# Hi there, I'm Motti 👋

	🎓 Senior @ [WashU](https://www.google.com/search?q=washu) | Analytics @ Deere + Dev Tools @ Microsoft

	<SocialLinks />
</div>

<style>
	.home {
		max-width: 1080px;
		text-align: center;
	}

	.profile-pic {
		width: 140px;
		height: 140px;
		border-radius: 50%;
		margin-bottom: 1.5rem;
		object-fit: cover;
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
