<script>
	import { onMount, onDestroy } from 'svelte';

	// ---- CONFIG ----
	const DROP_AT_SEC = 210.0;
	const START_EARLY_MS = 1200;

	// ---- HELPERS ----
	/** @param {number} n */
	function pad2(n) {
		return String(n).padStart(2, '0');
	}

	/** @param {number} ms */
	function fmtHMS(ms) {
		const s = Math.max(0, Math.floor(ms / 1000));
		const hh = Math.floor(s / 3600);
		const mm = Math.floor((s % 3600) / 60);
		const ss = s % 60;
		if (hh > 0) return `${hh}:${pad2(mm)}:${pad2(ss)}`;
		return `${mm}:${pad2(ss)}`;
	}

	/** @param {number} sec */
	function fmtMSS(sec) {
		if (!isFinite(sec) || sec < 0) return '0:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${pad2(s)}`;
	}

	function nextLocalMidnight(now = new Date()) {
		const mid = new Date(now);
		mid.setHours(24, 0, 0, 0);
		return mid;
	}

	// ---- STATE ----
	/** @type {HTMLAudioElement | null} */
	let audio = $state(null);
	let unlocked = $state(false);
	let paused = $state(true);
	let muted = $state(false);
	let volume = $state(0.85);
	let savedVolume = 0.85;
	let currentTime = $state(0);
	let duration = $state(0);
	let seekValue = $state(0);
	let syncEnabled = $state(true);
	let scheduled = false;
	let countdown = $state('--:--:--');
	/** @type {number | undefined} */
	let rafId;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let scheduledTimeout;

	// ---- COMPUTED ----
	let curDisplay = $derived(fmtMSS(currentTime));
	let durDisplay = $derived(fmtMSS(duration));

	// ---- SYNC LOGIC ----
	/** @param {number} midnightMs */
	function scheduleForThisMidnight(midnightMs) {
		const startAtMs = midnightMs - DROP_AT_SEC * 1000 - START_EARLY_MS;
		const nowMs = Date.now();

		if (startAtMs <= nowMs) {
			scheduled = true;
			return;
		}

		scheduled = true;
		const delay = startAtMs - nowMs;

		scheduledTimeout = setTimeout(async () => {
			if (!syncEnabled || !audio) return;
			try {
				await audio.play();
				audio.currentTime = Math.max(0, START_EARLY_MS / 1000);
			} catch (e) {
				console.warn('Auto play failed:', e);
			}
		}, delay);
	}

	function updateCountdown() {
		if (!syncEnabled) {
			countdown = '--:--:--';
			return;
		}

		const now = new Date();
		const mid = nextLocalMidnight(now);
		const msLeft = mid.getTime() - now.getTime();
		countdown = fmtHMS(msLeft);

		if (syncEnabled && unlocked && !scheduled) {
			scheduleForThisMidnight(mid.getTime());
		}
	}

	function tick() {
		updateCountdown();
		rafId = requestAnimationFrame(tick);
	}

	// ---- HANDLERS ----
	function onTimeUpdate() {
		if (!audio) return;
		currentTime = audio.currentTime;
		if (isFinite(audio.duration) && audio.duration > 0) {
			seekValue = Math.floor((audio.currentTime / audio.duration) * 1000);
		}
	}

	function onLoadedMetadata() {
		if (!audio) return;
		duration = audio.duration;
	}

	function onPlayPause() {
		if (!audio) return;
		paused = audio.paused;
	}

	/** @param {Event} e */
	function handleSeek(e) {
		if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return;
		const frac = Number(/** @type {HTMLInputElement} */ (e.target).value) / 1000;
		audio.currentTime = frac * audio.duration;
	}

	/** @param {Event} e */
	function handleVolume(e) {
		const v = Number(/** @type {HTMLInputElement} */ (e.target).value);
		volume = v;
		savedVolume = v;
		if (audio) {
			audio.volume = v;
			audio.muted = false;
			muted = false;
		}
	}

	function toggleMute() {
		if (!audio) return;
		if (muted || volume === 0) {
			audio.muted = false;
			muted = false;
			const v = savedVolume > 0 ? savedVolume : 0.85;
			audio.volume = v;
			volume = v;
		} else {
			savedVolume = volume;
			audio.muted = true;
			muted = true;
		}
	}

	async function togglePlay() {
		if (!audio) return;
		if (!unlocked) {
			audio.volume = volume;
			unlocked = true;
		}
		if (audio.paused) {
			try {
				await audio.play();
			} catch (e) {
				console.warn('Play failed:', e);
			}
		} else {
			audio.pause();
		}
	}

	function toggleSync() {
		syncEnabled = !syncEnabled;
		scheduled = false;
		if (scheduledTimeout) {
			clearTimeout(scheduledTimeout);
			scheduledTimeout = undefined;
		}
		updateCountdown();
	}

	function onVisibilityChange() {
		if (!document.hidden) {
			scheduled = false;
			if (scheduledTimeout) {
				clearTimeout(scheduledTimeout);
				scheduledTimeout = undefined;
			}
			updateCountdown();
		}
	}

	onMount(() => {
		rafId = requestAnimationFrame(tick);
		document.addEventListener('visibilitychange', onVisibilityChange);
	});

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
		if (scheduledTimeout) clearTimeout(scheduledTimeout);
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', onVisibilityChange);
		}
	});
</script>

<svelte:head>
	<title>NY Sync</title>
</svelte:head>

<div class="page">
	<main class="player">
		<a class="back" href="/">← home</a>

		<div class="album-art">
			<img src="/audio/cover.jpg" alt="Nights - Frank Ocean" />
		</div>

		<div class="track-info">
			<div class="track-title">Nights</div>
			<div class="track-artist">Frank Ocean</div>
		</div>

		<div class="seek-row">
			<span class="time">{curDisplay}</span>
			<input type="range" min="0" max="1000" value={seekValue} oninput={handleSeek} />
			<span class="time time-end">{durDisplay}</span>
		</div>

		<div class="controls">
			<button class="play-btn" aria-label={paused ? 'Play' : 'Pause'} onclick={togglePlay}>
				{#if paused}
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M8 5v14l11-7z" />
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="4" width="4" height="16" />
						<rect x="14" y="4" width="4" height="16" />
					</svg>
				{/if}
			</button>
		</div>

		<div class="volume-row">
			<button class="mute-btn" aria-label="Mute" onclick={toggleMute}>
				{#if muted || volume === 0}
					<svg class="vol-icon" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
						/>
					</svg>
				{:else}
					<svg class="vol-icon" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
						/>
					</svg>
				{/if}
			</button>
			<input type="range" min="0" max="1" step="0.01" value={volume} oninput={handleVolume} />
		</div>

		<div class="sync-row">
			<button class="sync-toggle" role="switch" aria-checked={syncEnabled} aria-label="Toggle midnight sync" onclick={toggleSync}>
				<span class="toggle-slider" class:active={syncEnabled}></span>
			</button>
			<span class="sync-label">Sync drop to midnight</span>
		</div>

		<div class="countdown-info" class:hidden={!syncEnabled}>
			<span class="countdown-label">Drop in</span>
			<span class="countdown-time">{countdown}</span>
		</div>

		<audio
			bind:this={audio}
			preload="metadata"
			src="/audio/Frank Ocean - Nights.mp3"
			ontimeupdate={onTimeUpdate}
			onloadedmetadata={onLoadedMetadata}
			onplay={onPlayPause}
			onpause={onPlayPause}
			onended={onPlayPause}
		></audio>
	</main>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg);
		font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
			sans-serif;
	}

	.player {
		width: 100%;
		max-width: 340px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
	}

	.back {
		align-self: flex-start;
		color: var(--muted);
		text-decoration: none;
		font-size: 14px;
		margin-bottom: 8px;
		transition: color 0.2s;
	}
	.back:hover {
		color: var(--fg);
	}

	/* Album Art */
	.album-art {
		width: 280px;
		height: 280px;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}
	.album-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Track Info */
	.track-info {
		text-align: center;
	}
	.track-title {
		font-size: 20px;
		font-weight: 600;
		margin-bottom: 4px;
		color: var(--fg);
	}
	.track-artist {
		font-size: 14px;
		color: var(--muted);
	}

	/* Seek Bar */
	.seek-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.time {
		font-size: 12px;
		color: var(--muted);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		min-width: 36px;
	}
	.time-end {
		text-align: right;
	}

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		flex: 1;
		height: 4px;
		background: var(--border);
		border-radius: 2px;
		cursor: pointer;
	}
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		background: var(--fg);
		border-radius: 50%;
		cursor: pointer;
		transition: transform 0.1s;
	}
	input[type='range']::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}
	input[type='range']::-moz-range-thumb {
		width: 12px;
		height: 12px;
		background: var(--fg);
		border: none;
		border-radius: 50%;
		cursor: pointer;
	}

	/* Controls */
	.controls {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.play-btn {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: none;
		background: var(--fg);
		color: var(--bg);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.1s, background 0.2s;
	}
	.play-btn:hover {
		transform: scale(1.05);
		background: #fff;
	}
	.play-btn:active {
		transform: scale(0.98);
	}
	.play-btn svg {
		width: 24px;
		height: 24px;
	}

	/* Volume */
	.volume-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.mute-btn {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background 0.2s;
	}
	.mute-btn:hover {
		background: var(--border);
	}
	.vol-icon {
		width: 20px;
		height: 20px;
		color: var(--muted);
		flex-shrink: 0;
	}
	.mute-btn:hover .vol-icon {
		color: var(--fg);
	}
	.volume-row input[type='range'] {
		height: 4px;
	}

	/* Sync Toggle */
	.sync-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.sync-label {
		font-size: 13px;
		color: var(--muted);
	}
	.sync-toggle {
		position: relative;
		width: 40px;
		height: 22px;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
	}
	.toggle-slider {
		position: absolute;
		inset: 0;
		background: var(--border);
		border-radius: 22px;
		transition: background 0.2s;
	}
	.toggle-slider::before {
		content: '';
		position: absolute;
		width: 16px;
		height: 16px;
		left: 3px;
		top: 3px;
		background: var(--fg);
		border-radius: 50%;
		transition: transform 0.2s;
	}
	.toggle-slider.active {
		background: #1db954;
	}
	.toggle-slider.active::before {
		transform: translateX(18px);
	}

	/* Countdown */
	.countdown-info {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--muted);
		opacity: 1;
		transition: opacity 0.3s;
	}
	.countdown-info.hidden {
		opacity: 0;
		pointer-events: none;
	}
	.countdown-time {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		color: var(--fg);
	}

	/* Responsive */
	@media (max-width: 380px) {
		.album-art {
			width: 240px;
			height: 240px;
		}
		.player {
			padding: 16px;
		}
	}
</style>
