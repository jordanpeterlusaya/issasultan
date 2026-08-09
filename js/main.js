document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const header = document.getElementById("site-header");
  const navToggle = document.getElementById("nav-toggle");
  const navMobile = document.getElementById("nav-mobile");

  const closeMenu = () => {
    if (!header || !navToggle || !navMobile) return;
    header.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Fungua menyu");
    navMobile.hidden = true;
  };

  const openMenu = () => {
    if (!header || !navToggle || !navMobile) return;
    header.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Funga menyu");
    navMobile.hidden = false;
  };

  if (navToggle && navMobile) {
    navToggle.addEventListener("click", () => {
      if (navMobile.hidden) openMenu();
      else closeMenu();
    });

    navMobile.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 18);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Scroll reveals
  const reveals = document.querySelectorAll(".reveal");
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
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => {
      if (el.classList.contains("hero-content")) {
        el.classList.add("is-visible");
        return;
      }
      observer.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  // Sound: separate audio from silent video
  const video = document.getElementById("hero-video");
  const soundToggle = document.getElementById("sound-toggle");
  const soundLabel = soundToggle?.querySelector(".sound-toggle-label");
  const audioSrc = "assets/audio/sheikh-issa.m4a";
  let soundOn = false;
  let audio = null;

  const setSoundUI = (on) => {
    soundOn = on;
    if (!soundToggle || !soundLabel) return;
    soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
    soundToggle.classList.toggle("is-on", on);
    soundLabel.textContent = on
      ? soundLabel.dataset.labelOn
      : soundLabel.dataset.labelOff;
  };

  const stopSound = () => {
    setSoundUI(false);
    if (!audio) return;
    try {
      audio.pause();
    } catch {
      // ignore
    }
    audio.muted = true;
    audio.volume = 0;
    audio.removeAttribute("src");
    audio.src = "";
    audio.srcObject = null;
    try {
      audio.load();
    } catch {
      // ignore
    }
    audio = null;
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.metadata = null;
      } catch {
        // ignore
      }
    }
  };

  const startSound = async () => {
    if (!audio) {
      audio = new Audio(audioSrc);
      audio.loop = true;
      audio.preload = "auto";
    }
    audio.muted = false;
    audio.volume = 1;
    if (video && Number.isFinite(video.currentTime)) {
      try {
        audio.currentTime = video.currentTime % (audio.duration || video.duration || 44);
      } catch {
        // ignore
      }
    }
    try {
      await audio.play();
      setSoundUI(true);
      return true;
    } catch {
      stopSound();
      return false;
    }
  };

  if (video) {
    const preferReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    if (preferReduced) {
      video.removeAttribute("autoplay");
      video.pause();
      if (soundToggle) soundToggle.hidden = true;
    } else {
      const playVideo = () => {
        video.muted = true;
        video.volume = 0;
        video.play().catch(() => {});
      };
      if (video.readyState >= 2) playVideo();
      else video.addEventListener("loadeddata", playVideo, { once: true });
    }

    const onLeave = () => stopSound();
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) onLeave();
      },
      true
    );
    window.addEventListener("pagehide", onLeave, true);
    window.addEventListener("beforeunload", onLeave, true);
    window.addEventListener("unload", onLeave, true);
    window.addEventListener("freeze", onLeave, true);

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
      stopSound();
      window.setTimeout(() => {
        if (target === "_blank") window.open(href, "_blank", "noopener,noreferrer");
        else window.location.href = href;
      }, 80);
    };

    document.addEventListener(
      "pointerdown",
      (event) => {
        const link = event.target.closest("a");
        if (isLeaveLink(link)) stopSound();
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

    if (soundToggle) {
      soundToggle.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (soundOn) stopSound();
          else await startSound();
        },
        true
      );
    }
  }
});
