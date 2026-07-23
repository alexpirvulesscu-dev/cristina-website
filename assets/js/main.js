/* ==========================================================================
   Cristina Pîrvulescu — scroll choreography
   Lenis smooth scroll + GSAP ScrollTrigger.
   The page is fully readable with JS disabled; this file only adds motion.
   ========================================================================== */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // the hero is a scroll narrative — always start it from the top on reload
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  /* ---------- nav background on scroll ---------- */
  var nav = document.getElementById("nav");
  function onScrollNav() {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- mobile menu: hamburger open/close ---------- */
  var navToggle = document.getElementById("nav-toggle");
  if (navToggle) {
    var closeMenu = function () {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close after tapping any link (anchor or page link)
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    // close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- consultation form → mailto draft ---------- */
  var form = document.getElementById("consult-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      var subject = "Consultation request — " + name;
      var body = message + "\n\n— " + name + " (" + email + ")";
      window.location.href =
        "mailto:consult@cpdentalaesthetics.com?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }

  /* ---------- everything below needs GSAP; bail gracefully without it ----- */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- load-in: she and the first line are present immediately ----- */
  if (!reduced) {
    gsap.from(".hero-cutout", { opacity: 0, duration: 1.4, ease: "power2.out", delay: 0.1 });
    gsap.from(".hero-eyebrow", { opacity: 0, duration: 1.0, delay: 0.6 });
  }

  if (reduced) return; // readable static page; no smooth scroll, no pins

  /* ---------- Lenis smooth scroll, driven by the GSAP ticker ---------- */
  var lenis = new Lenis({ duration: 1.25, smoothWheel: true });
  window.__lenis = lenis; // debug/testing handle
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // anchor links through Lenis
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: 0 }); }
    });
  });

  /* ---------- hero: pinned narrative scrub (function.ai style) ----------
     Phase A: first line sharpens from a blur, she brightens.
     Phase B: line 1 gives way to "It simply looks like you." + footer copy.
     Phase C: the whole stage turns white; she is fully lit.               */
  var stage = document.querySelector(".hero-stage");
  if (stage) {
  var heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "+=360%",
      pin: ".hero-stage",
      scrub: true,
      onUpdate: function (self) {
        var light = self.progress > 0.4;
        stage.classList.toggle("is-light", light);
        nav.classList.toggle("on-dark", !light);
      },
      onLeave: function () { nav.classList.remove("on-dark"); },
      onEnterBack: function () { nav.classList.add("on-dark"); }
    }
  });
  heroTl
    // the resting eyebrow label fades out as you begin to scroll
    .to(".hero-eyebrow", { opacity: 0, ease: "none", duration: 0.12 }, 0)
    // the stage warms from deep green to light; she brightens with it
    .to(".hero-stage", { backgroundColor: "#f0f4f8", ease: "none", duration: 0.32 }, 0.14)
    .fromTo("#hero-cutout",
      { filter: "brightness(1) drop-shadow(0 30px 60px rgba(10,16,11,0.4))" },
      { filter: "brightness(1.03) drop-shadow(0 30px 60px rgba(44,54,44,0.18))", ease: "none", duration: 0.32 }, 0.14)
    .to(".scroll-hint", { opacity: 0, ease: "none", duration: 0.12 }, 0.1)
    // she glides to the right; the headline, copy and CTAs rise in on the left
    .to("#hero-cutout", { x: "24vw", ease: "none", duration: 0.36 }, 0.34)
    .fromTo("#hero-intro",
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, ease: "none", duration: 0.26 }, 0.44)
    .to({}, { duration: 0.12 }); // held beat before the hero releases
  }

  /* ---------- method: pinned analysis with stepped reveals ---------- */
  var steps = gsap.utils.toArray(".method-step");
  var analysisVideo = document.getElementById("analysis-video");
  ScrollTrigger.create({
    trigger: ".method",
    start: "top top",
    end: "+=140%",
    pin: ".method-pin",
    scrub: true,
    onUpdate: function (self) {
      var idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
      steps.forEach(function (s, i) { s.classList.toggle("is-active", i === idx); });
    },
    // restart from the beginning each time the section is reached (both when
    // scrolling down into it and back up into it); keep playing while scrolling
    onEnter: function () { if (analysisVideo) { analysisVideo.currentTime = 0; analysisVideo.play().catch(function () {}); } },
    onEnterBack: function () { if (analysisVideo) { analysisVideo.currentTime = 0; analysisVideo.play().catch(function () {}); } }
  });
  gsap.from(".method-media", {
    scrollTrigger: { trigger: ".method", start: "top 70%", end: "top 20%", scrub: true },
    y: 60, opacity: 0.4, ease: "none"
  });

  /* ---------- story: line-by-line reveal + route draw ---------- */
  gsap.utils.toArray(".story-line").forEach(function (line) {
    gsap.from(line, {
      scrollTrigger: { trigger: line, start: "top 85%", end: "top 55%", scrub: true },
      y: 40, opacity: 0, ease: "none"
    });
  });
  gsap.from(".story-route i", {
    scrollTrigger: { trigger: ".story-route", start: "top 85%" },
    scaleX: 0, duration: 1.2, ease: "power2.out", stagger: 0.25
  });
  gsap.from(".story-photo", {
    scrollTrigger: { trigger: ".story-photo", start: "top 85%" },
    y: 60, opacity: 0, duration: 1.1, ease: "power2.out"
  });

  /* ---------- work: scroll-driven before/after wipes ---------- */
  gsap.utils.toArray(".case").forEach(function (block) {
    var after = block.querySelector(".ba-after");
    var edge = block.querySelector(".ba-edge");
    var labelB = block.querySelector(".ba-label-before");
    var labelA = block.querySelector(".ba-label-after");
    var wipe = { p: 0 };
    gsap.to(wipe, {
      p: 1, ease: "none",
      /* hold the BEFORE fully visible while the block enters; the wipe only
         sweeps once the case is well into view. Full-face (tall) pairs wait
         until the photo itself reaches the middle of the screen. */
      scrollTrigger: block.classList.contains("case-tall")
        ? { trigger: block.querySelector(".ba"), start: "center 52%", end: "center 18%", scrub: true }
        : { trigger: block, start: "top 45%", end: "top 2%", scrub: true },
      onUpdate: function () {
        var pct = wipe.p * 100;
        after.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
        edge.style.transform = "translateX(" + (pct / 100 * after.offsetWidth - 1) + "px)";
        if (labelA) labelA.style.opacity = wipe.p > 0.5 ? 1 : 0.35;
        if (labelB) labelB.style.opacity = wipe.p > 0.5 ? 0.35 : 1;
      }
    });
    gsap.from(block, {
      scrollTrigger: { trigger: block, start: "top 88%" },
      y: 50, opacity: 0, duration: 1.0, ease: "power2.out"
    });
  });

  /* ---------- testimonials + credentials: simple staggered reveals ---------- */
  gsap.from(".tcard", {
    scrollTrigger: { trigger: ".testimonials", start: "top 80%" },
    y: 40, opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.08
  });
  gsap.from(".credit", {
    scrollTrigger: { trigger: ".credbar", start: "top 85%" },
    y: 30, opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.12
  });

  /* ---------- consultation reveal ---------- */
  gsap.from(".consult-copy, .consult-form", {
    scrollTrigger: { trigger: ".consult", start: "top 75%" },
    y: 60, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.15
  });

  /* refresh once everything (fonts, images) is in */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
