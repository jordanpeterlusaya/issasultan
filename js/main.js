document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const header = document.querySelector(".site-header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const video = document.getElementById("hero-video");
  const source = video?.querySelector("source");
  const soundToggle = document.getElementById("sound-toggle");
  const soundLabel = soundToggle?.querySelector(".sound-toggle-label");
  const videoSrc = source?.getAttribute("src") || "assets/video/sheikh-issa.mp4";

  let soundOn = false;
  let mediaAlive = true;
  let unlockCleanup = null;
  let starting = false;

  const setSoundUI = (on) => {
    soundOn = on;
    if (!soundToggle || !soundLabel) return;
    soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
    soundToggle.classList.toggle("is-on", on);
    soundLabel.textContent = on
      ? soundLabel.dataset.labelOn
      : soundLabel.dataset.labelOff;
  };

  const clearUnlock = () => {
    if (unlockCleanup) {
      unlockCleanup();
      unlockCleanup = null;
    }
  };

  const ensureSource = () => {
    if (!video || !source) return;
    if (!source.getAttribute("src")) {
      source.setAttribute("src", videoSrc);
      video.load();
    }
    mediaAlive = true;
  };

  const killMedia = () => {
    if (!video) return;
    clearUnlock();
    soundOn = false;
    setSoundUI(false);

    try {
      video.pause();
    } catch {
      // ignore
    }

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.volume = 0;
    video.currentTime = 0;

    // Detach the file so mobile browsers cannot keep playing audio in background.
    if (source) source.removeAttribute("src");
    video.removeAttribute("src");
    try {
      video.load();
    } catch {
      // ignore
    }
    mediaAlive = false;
  };

  const silenceAndPause = () => {
    if (!video) return;
    clearUnlock();
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.volume = 0;
    try {
      video.pause();
    } catch {
      // ignore
    }
    setSoundUI(false);
  };

  const playWithSound = async () => {
    if (!video) return false;
    ensureSource();
    video.muted = false;
    video.defaultMuted = false;
    video.removeAttribute("muted");
    video.volume = 1;
    try {
      await video.play();
      setSoundUI(true);
      return true;
    } catch {
      silenceAndPause();
      return false;
    }
  };

  const playMuted = async () => {
    if (!video) return;
    ensureSource();
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.volume = 0;
    setSoundUI(false);
    try {
      await video.play();
    } catch {
      // ignore
    }
  };

  if (video) {
    const preferReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    if (preferReduced) {
      video.removeAttribute("autoplay");
      killMedia();
      if (soundToggle) soundToggle.hidden = true;
    } else {
      const startPlayback = async () => {
        if (starting || document.hidden) return;
        starting = true;
        const ok = await playWithSound();
        if (!ok && !document.hidden) {
          await playMuted();

          const unlock = async () => {
            if (document.hidden) return;
            const sounded = await playWithSound();
            if (sounded) clearUnlock();
          };

          const removeUnlockListeners = () => {
            window.removeEventListener("pointerdown", unlock, true);
            window.removeEventListener("touchstart", unlock, true);
            window.removeEventListener("keydown", unlock, true);
            unlockCleanup = null;
          };

          unlockCleanup = removeUnlockListeners;
          window.addEventListener("pointerdown", unlock, { once: true, passive: true, capture: true });
          window.addEventListener("touchstart", unlock, { once: true, passive: true, capture: true });
          window.addEventListener("keydown", unlock, { once: true, capture: true });
        }
        starting = false;
      };

      // Avoid native autoplay fighting our JS control.
      video.removeAttribute("autoplay");

      if (video.readyState >= 2) {
        startPlayback();
      } else {
        ensureSource();
        video.addEventListener("loadeddata", startPlayback, { once: true });
        video.load();
      }
    }

    const onLeave = () => {
      killMedia();
    };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        onLeave();
        return;
      }
      // Do not auto-restart with sound when returning — wait for user.
      if (!preferReduced) {
        playMuted();
      }
    });

    window.addEventListener("pagehide", onLeave, { capture: true });
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("unload", onLeave);
    window.addEventListener("freeze", onLeave);
    window.addEventListener("blur", () => {
      // Some mobile browsers keep audio after app switch; kill on blur too.
      if (document.hidden) onLeave();
    });

    document.addEventListener("freeze", onLeave);

    if (soundToggle) {
      soundToggle.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearUnlock();

        if (soundOn) {
          // Turn sound off but keep video picture playing.
          video.muted = true;
          video.defaultMuted = true;
          video.setAttribute("muted", "");
          video.volume = 0;
          setSoundUI(false);
          if (video.paused && mediaAlive) {
            playMuted();
          }
          return;
        }

        await playWithSound();
      });
    }
  }

  const sections = document.querySelectorAll(".section");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
  } else {
    sections.forEach((section) => section.classList.add("is-visible"));
  }
});
