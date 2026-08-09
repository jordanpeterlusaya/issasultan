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
  const soundToggle = document.getElementById("sound-toggle");
  const soundLabel = soundToggle?.querySelector(".sound-toggle-label");
  let soundEnabled = false;
  let unlockCleanup = null;

  const setSoundUI = (soundOn) => {
    soundEnabled = soundOn;
    if (!soundToggle || !soundLabel) return;
    soundToggle.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundToggle.classList.toggle("is-on", soundOn);
    soundLabel.textContent = soundOn
      ? soundLabel.dataset.labelOn
      : soundLabel.dataset.labelOff;
  };

  const muteVideo = () => {
    if (!video) return;
    video.muted = true;
    video.setAttribute("muted", "");
    video.volume = 0;
    setSoundUI(false);
  };

  const stopVideo = () => {
    if (!video) return;
    muteVideo();
    video.pause();
  };

  const enableSound = async () => {
    if (!video) return false;
    video.muted = false;
    video.removeAttribute("muted");
    video.volume = 1;
    try {
      await video.play();
      setSoundUI(true);
      return true;
    } catch {
      muteVideo();
      return false;
    }
  };

  if (video) {
    const preferReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    video.volume = 1;

    if (preferReduced) {
      video.removeAttribute("autoplay");
      stopVideo();
      if (soundToggle) soundToggle.hidden = true;
    } else {
      const startWithSound = async () => {
        const ok = await enableSound();
        if (ok) return;

        muteVideo();
        try {
          await video.play();
        } catch {
          // ignore
        }

        const unlock = async () => {
          const sounded = await enableSound();
          if (!sounded) return;
          if (unlockCleanup) unlockCleanup();
        };

        const removeUnlockListeners = () => {
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("touchstart", unlock);
          window.removeEventListener("keydown", unlock);
          window.removeEventListener("scroll", unlock);
          unlockCleanup = null;
        };

        unlockCleanup = removeUnlockListeners;
        window.addEventListener("pointerdown", unlock, { once: true, passive: true });
        window.addEventListener("touchstart", unlock, { once: true, passive: true });
        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("scroll", unlock, { once: true, passive: true });
      };

      if (video.readyState >= 2) {
        startWithSound();
      } else {
        video.addEventListener("loadeddata", startWithSound, { once: true });
      }
    }

    // Stop audio when leaving the tab/site (or app is backgrounded).
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopVideo();
        return;
      }

      // Resume muted video when user returns; they can re-enable sound.
      if (!preferReduced) {
        muteVideo();
        video.play().catch(() => {});
      }
    });

    window.addEventListener("pagehide", stopVideo);
    window.addEventListener("beforeunload", stopVideo);
    window.addEventListener("freeze", stopVideo);

    if (soundToggle) {
      soundToggle.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });

      soundToggle.addEventListener("click", async (event) => {
        event.stopPropagation();
        if (unlockCleanup) unlockCleanup();

        if (!soundEnabled || video.muted || video.volume === 0) {
          const ok = await enableSound();
          if (!ok) muteVideo();
        } else {
          muteVideo();
        }
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
