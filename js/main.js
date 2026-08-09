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

  const mediaRoot = document.querySelector(".hero-media");
  let video = document.getElementById("hero-video");
  const soundToggle = document.getElementById("sound-toggle");
  const soundLabel = soundToggle?.querySelector(".sound-toggle-label");
  const poster = "assets/images/hero-poster.jpg";
  const videoSrc = "assets/video/sheikh-issa.mp4";

  let soundOn = false;
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
    if (typeof unlockCleanup === "function") {
      unlockCleanup();
    }
    unlockCleanup = null;
  };

  const buildVideo = () => {
    const el = document.createElement("video");
    el.id = "hero-video";
    el.className = "hero-video";
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    el.poster = poster;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
    el.setAttribute("disablepictureinpicture", "");
    el.controls = false;
    el.muted = true;
    el.defaultMuted = true;
    el.volume = 0;

    const source = document.createElement("source");
    source.src = videoSrc;
    source.type = "video/mp4";
    el.appendChild(source);
    return el;
  };

  const hardStop = () => {
    clearUnlock();
    setSoundUI(false);

    if (!video) return;

    try {
      video.pause();
    } catch {
      // ignore
    }

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.removeAttribute("src");
    video.querySelectorAll("source").forEach((node) => {
      node.removeAttribute("src");
      node.remove();
    });

    try {
      video.load();
    } catch {
      // ignore
    }

    // Replace the element so Chrome cannot keep a detached audio pipeline alive.
    if (mediaRoot && video.parentNode === mediaRoot) {
      const next = buildVideo();
      mediaRoot.replaceChild(next, video);
      video = next;
      wireVideoEvents(video);
    }
  };

  const playMuted = async (target = video) => {
    if (!target || document.hidden) return;
    if (!target.querySelector("source")?.getAttribute("src")) {
      const source = document.createElement("source");
      source.src = videoSrc;
      source.type = "video/mp4";
      target.appendChild(source);
      target.load();
    }
    target.muted = true;
    target.defaultMuted = true;
    target.setAttribute("muted", "");
    target.volume = 0;
    setSoundUI(false);
    try {
      await target.play();
    } catch {
      // ignore
    }
  };

  const playWithSound = async () => {
    if (!video || document.hidden) return false;
    if (!video.querySelector("source")?.getAttribute("src")) {
      const source = document.createElement("source");
      source.src = videoSrc;
      source.type = "video/mp4";
      video.appendChild(source);
      video.load();
    }
    video.muted = false;
    video.defaultMuted = false;
    video.removeAttribute("muted");
    video.volume = 1;
    try {
      await video.play();
      setSoundUI(true);
      return true;
    } catch {
      await playMuted(video);
      return false;
    }
  };

  const wireVideoEvents = (el) => {
    // no-op placeholder for future hooks; keeps reference updates simple
    void el;
  };

  if (video && mediaRoot) {
    const preferReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    video.removeAttribute("autoplay");
    wireVideoEvents(video);

    if (preferReduced) {
      hardStop();
      if (soundToggle) soundToggle.hidden = true;
    } else {
      const startPlayback = async () => {
        if (starting || document.hidden) return;
        starting = true;

        const ok = await playWithSound();
        if (!ok && !document.hidden) {
          await playMuted(video);

          const unlock = async () => {
            if (document.hidden || !soundToggle) return;
            // Ignore unlock taps on the sound button itself.
            const sounded = await playWithSound();
            if (sounded) clearUnlock();
          };

          const removeUnlockListeners = () => {
            window.removeEventListener("pointerdown", unlock, true);
            window.removeEventListener("touchstart", unlock, true);
            window.removeEventListener("keydown", unlock, true);
          };

          unlockCleanup = removeUnlockListeners;
          window.addEventListener("pointerdown", unlock, {
            once: true,
            passive: true,
            capture: true,
          });
          window.addEventListener("touchstart", unlock, {
            once: true,
            passive: true,
            capture: true,
          });
          window.addEventListener("keydown", unlock, { once: true, capture: true });
        }

        starting = false;
      };

      if (video.readyState >= 2) {
        startPlayback();
      } else {
        video.addEventListener("loadeddata", startPlayback, { once: true });
        video.load();
      }
    }

    const onLeave = () => hardStop();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        onLeave();
      }
      // Do not auto-restart media when returning — user taps Washa sauti.
    }, true);

    window.addEventListener("pagehide", onLeave, true);
    window.addEventListener("beforeunload", onLeave, true);
    window.addEventListener("unload", onLeave, true);
    window.addEventListener("freeze", onLeave, true);
    document.addEventListener("freeze", onLeave, true);

    // Stop sound FIRST, then navigate (WhatsApp/tel/external).
    const isLeaveLink = (link) => {
      if (!link) return false;
      const href = link.getAttribute("href") || "";
      return (
        link.target === "_blank" ||
        href.startsWith("tel:") ||
        href.startsWith("sms:") ||
        href.startsWith("https://wa.me") ||
        href.startsWith("http://") ||
        href.startsWith("https://")
      );
    };

    const stopThenGo = (link) => {
      const href = link.href;
      const target = link.target;
      hardStop();
      window.setTimeout(() => {
        if (target === "_blank") {
          window.open(href, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = href;
        }
      }, 120);
    };

    document.addEventListener(
      "pointerdown",
      (event) => {
        const link = event.target.closest("a");
        if (!isLeaveLink(link)) return;
        // Mute immediately on press, before click/navigation.
        hardStop();
      },
      true
    );

    document.addEventListener(
      "click",
      (event) => {
        const link = event.target.closest("a");
        if (!isLeaveLink(link)) return;
        event.preventDefault();
        event.stopPropagation();
        stopThenGo(link);
      },
      true
    );

    window.addEventListener("blur", () => {
      // Extra guard for mobile Chrome app switches.
      window.setTimeout(() => {
        if (document.hidden) hardStop();
      }, 0);
    });

    if (soundToggle) {
      soundToggle.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();
          event.stopPropagation();
          clearUnlock();

          if (soundOn) {
            if (!video) return;
            video.muted = true;
            video.defaultMuted = true;
            video.setAttribute("muted", "");
            video.volume = 0;
            setSoundUI(false);
            return;
          }

          await playWithSound();
        },
        true
      );
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
