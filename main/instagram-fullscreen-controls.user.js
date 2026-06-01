// ==UserScript==
// @name         PRV_Instagram Reels True Fullscreen Controls
// @namespace    https://www.instagram.com/
// @version      5.0
// @author       colonelEnigma
// @description  Custom Reel controls with true fullscreen view using captureStream
// @license      MIT
// @match        https://www.instagram.com/reels/*
// @match        https://www.instagram.com/reel/*
// @match        https://www.instagram.com/p/*
// @downloadURL  http://github.com/colonelEnigma/web-enhancement-scripts/blob/main/main/instagram-fullscreen-controls.user.js
// @updateURL    http://github.com/colonelEnigma/web-enhancement-scripts/blob/main/main/instagram-fullscreen-controls.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  let activeVideo = null;
  let controls = null;
  let fullscreenLayer = null;
  let fullscreenVideo = null;
  let cinemaMode = false;

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  function injectCSS() {
    if (document.getElementById('ig-true-fullscreen-style')) return;

    const style = document.createElement('style');
    style.id = 'ig-true-fullscreen-style';

    style.textContent = `
      .ig-custom-controls {
        position: fixed !important;
        left: 50% !important;
        bottom: 30px !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        background: rgba(0, 0, 0, 0.78) !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 999px !important;
        font-size: 13px !important;
        pointer-events: auto !important;
      }

      .ig-custom-controls button {
        border: none !important;
        background: transparent !important;
        color: white !important;
        cursor: pointer !important;
        font-size: 16px !important;
        padding: 2px 6px !important;
      }

      .ig-custom-controls input[type="range"] {
        width: 240px !important;
        cursor: pointer !important;
      }

      .ig-custom-controls select {
  background: black !important;
  color: white !important;
  border: 1px solid #555 !important;
  border-radius: 6px !important;
  padding: 2px 4px !important;
  cursor: pointer !important;
}

      .ig-fullscreen-layer {
        position: fixed !important;
        inset: 0 !important;
        background: black !important;
        z-index: 2147483645 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: none !important;
      }

      .ig-fullscreen-layer video {
        width: 100vw !important;
        height: 100vh !important;
        object-fit: contain !important;
        background: black !important;
      }

      body.ig-cinema-active {
        overflow: hidden !important;
        background: black !important;
      }
    `;

    document.head.appendChild(style);
  }

  function getVisibleVideo() {
    const videos = Array.from(document.querySelectorAll('video'));

    let bestVideo = null;
    let bestArea = 0;

    for (const video of videos) {
      if (video.closest('.ig-fullscreen-layer')) continue;

      const rect = video.getBoundingClientRect();

      const visible =
        rect.width > 100 &&
        rect.height > 100 &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;

      if (!visible) continue;

      const area = rect.width * rect.height;

      if (area > bestArea) {
        bestArea = area;
        bestVideo = video;
      }
    }

    return bestVideo;
  }

  function updateActiveVideo() {
    const video = getVisibleVideo();

    if (!video) return;

    if (activeVideo !== video) {
      activeVideo = video;
      activeVideo.controls = false;
        const speedSelect = document.getElementById('ig-speed');
if (speedSelect) {
  activeVideo.playbackRate = Number(speedSelect.value);
}

      if (cinemaMode) {
        rebuildFullscreenVideo();
      }
    }
  }

  function createControls() {
    if (controls) return;

    controls = document.createElement('div');
    controls.className = 'ig-custom-controls';

    controls.innerHTML = `
      <button id="ig-prev">↑</button>
      <button id="ig-play">▶</button>
      <input id="ig-progress" type="range" min="0" max="100" value="0">
      <span id="ig-time">0:00 / 0:00</span>
      <button id="ig-mute">🔊</button>
      <select id="ig-speed">
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1" selected>1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
      </select>

      <button id="ig-next">↓</button>
      <button id="ig-fullscreen">⛶</button>
    `;

    document.body.appendChild(controls);

    controls.addEventListener('click', e => e.stopPropagation());

    document.getElementById('ig-play').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      if (!activeVideo) return;

      if (activeVideo.paused) {
        activeVideo.play();
      } else {
        activeVideo.pause();
      }

      updateUI();
    });

      document.getElementById('ig-speed').addEventListener('change', function (e) {
  e.preventDefault();
  e.stopPropagation();

  if (!activeVideo) return;

  const speed = Number(this.value);

  activeVideo.playbackRate = speed;

  if (fullscreenVideo) {
    fullscreenVideo.playbackRate = speed;
  }
});

    document.getElementById('ig-mute').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      if (!activeVideo) return;

      activeVideo.muted = !activeVideo.muted;
      updateUI();
    });

    document.getElementById('ig-progress').addEventListener('input', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (!activeVideo || !activeVideo.duration) return;

      activeVideo.currentTime = (this.value / 100) * activeVideo.duration;
      updateUI();
    });

    document.getElementById('ig-next').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      nextReel();
    });

    document.getElementById('ig-prev').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      previousReel();
    });

    document.getElementById('ig-fullscreen').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      toggleCinemaMode();
    });
  }

  function createFullscreenLayer() {
    if (fullscreenLayer) return;

    fullscreenLayer = document.createElement('div');
    fullscreenLayer.className = 'ig-fullscreen-layer';

    fullscreenVideo = document.createElement('video');
    fullscreenVideo.autoplay = true;
    fullscreenVideo.muted = true;
    fullscreenVideo.playsInline = true;
fullscreenVideo.playbackRate = activeVideo.playbackRate || 1;
    fullscreenLayer.appendChild(fullscreenVideo);
    document.body.appendChild(fullscreenLayer);
  }

  function rebuildFullscreenVideo() {
    if (!cinemaMode || !activeVideo) return;

    createFullscreenLayer();

    try {
      const stream =
        activeVideo.captureStream?.() ||
        activeVideo.mozCaptureStream?.();

      if (!stream) {
        console.warn('captureStream is not supported in this browser.');
        return;
      }

      fullscreenVideo.srcObject = stream;
      fullscreenVideo.currentTime = activeVideo.currentTime;
      fullscreenVideo.play().catch(() => {});
    } catch (err) {
      console.warn('Could not capture Instagram video stream:', err);
    }
  }

  function enterCinemaMode() {
    cinemaMode = true;
    document.body.classList.add('ig-cinema-active');

    updateActiveVideo();

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    }

    createFullscreenLayer();
    rebuildFullscreenVideo();
    updateUI();
  }

  function exitCinemaMode() {
    cinemaMode = false;
    document.body.classList.remove('ig-cinema-active');

    if (fullscreenVideo) {
      fullscreenVideo.pause();
      fullscreenVideo.srcObject = null;
    }

    if (fullscreenLayer) {
      fullscreenLayer.remove();
      fullscreenLayer = null;
      fullscreenVideo = null;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    updateUI();
  }

  function toggleCinemaMode() {
    if (cinemaMode) {
      exitCinemaMode();
    } else {
      enterCinemaMode();
    }
  }

  function nextReel() {
    window.scrollBy({
      top: window.innerHeight * 0.9,
      behavior: 'smooth'
    });

    setTimeout(() => {
      updateActiveVideo();
      rebuildFullscreenVideo();
      updateUI();
    }, 700);
  }

  function previousReel() {
    window.scrollBy({
      top: -window.innerHeight * 0.9,
      behavior: 'smooth'
    });

    setTimeout(() => {
      updateActiveVideo();
      rebuildFullscreenVideo();
      updateUI();
    }, 700);
  }

  function updateUI() {
    if (!controls) return;

    updateActiveVideo();

    if (!activeVideo) {
      controls.style.display = 'none';
      return;
    }

    controls.style.display = 'flex';

    const playBtn = document.getElementById('ig-play');
    const progress = document.getElementById('ig-progress');
    const timeText = document.getElementById('ig-time');
    const muteBtn = document.getElementById('ig-mute');

    playBtn.textContent = activeVideo.paused ? '▶' : '⏸';
    muteBtn.textContent = activeVideo.muted ? '🔇' : '🔊';

    if (activeVideo.duration) {
      progress.value = (activeVideo.currentTime / activeVideo.duration) * 100;
      timeText.textContent =
        `${formatTime(activeVideo.currentTime)} / ${formatTime(activeVideo.duration)}`;
    }
  }

  document.addEventListener('keydown', e => {
    if (!cinemaMode) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextReel();
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      previousReel();
    }

    if (e.key === 'Escape') {
      exitCinemaMode();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && cinemaMode) {
      cinemaMode = false;
      document.body.classList.remove('ig-cinema-active');

      if (fullscreenVideo) {
        fullscreenVideo.pause();
        fullscreenVideo.srcObject = null;
      }

      if (fullscreenLayer) {
        fullscreenLayer.remove();
        fullscreenLayer = null;
        fullscreenVideo = null;
      }
    }
  });

  function init() {
    injectCSS();
    createControls();
    updateUI();
  }

  init();

  setInterval(updateUI, 700);
})();