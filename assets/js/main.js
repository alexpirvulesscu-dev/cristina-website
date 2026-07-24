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
        "mailto:info@cpdentalaesthetics.com?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }

  /* ---------- everything below needs GSAP; bail gracefully without it ----- */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // true on phones — several sections choreograph differently there
  function mob() { return window.matchMedia("(max-width: 760px)").matches; }

  /* ---------- load-in: she and the first line are present immediately ----- */
  if (!reduced) {
    gsap.from(".hero-cutout", { opacity: 0, duration: 1.4, ease: "power2.out", delay: 0.1 });
    gsap.from("#hero-logo", { opacity: 0, duration: 1.2, ease: "power2.out", delay: 0.25 });
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
  var heroLogo = document.getElementById("hero-logo");
  if (stage) {
  // The big brand logo is THE logo on the home page — hide the nav's own copy
  // so there is only ever one mark, and start with the nav chrome hidden.
  var navLogoImg = document.querySelector(".nav-logo img");
  if (navLogoImg) navLogoImg.style.opacity = "0";
  nav.classList.add("pre-logo");

  // Centre the cutout via GSAP so the later x-glide composes with it instead
  // of discarding the CSS translateX(-50%). She is a background-removed cutout
  // whose body sits ~4.5% left of the image centre, so on phones we nudge the
  // image right by that much to centre HER, not the empty picture box. Desktop
  // keeps the plain box-centre (-50) unchanged.
  function heroCutX() { return mob() ? -45.5 : -50; }
  gsap.set("#hero-cutout", { xPercent: heroCutX });

  // landing scale — the big logo should span ~86% of the screen width but
  // never balloon past ~760px on a desktop. Computed from the viewport so it
  // fits phones (where 4.2× would overflow) as well as wide screens.
  function bigScale() {
    var target = Math.min(760, window.innerWidth * 0.86);
    return target / heroLogo.offsetWidth;
  }

  // Offsets that place the (top-left-anchored) logo, scaled up, centred on
  // screen. Function-based so GSAP recomputes them on every refresh/resize.
  function logoStartX() {
    var left = parseFloat(getComputedStyle(heroLogo).left) || 0;
    return window.innerWidth / 2 - (heroLogo.offsetWidth * bigScale()) / 2 - left;
  }
  function logoStartY() {
    var top = parseFloat(getComputedStyle(heroLogo).top) || 0;
    return window.innerHeight * 0.27 - (heroLogo.offsetHeight * bigScale()) / 2 - top;
  }

  var heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      // phones scroll through the hero 30% faster (shorter pin distance)
      end: function () { return mob() ? "+=252%" : "+=360%"; },
      pin: ".hero-stage",
      scrub: true,
      invalidateOnRefresh: true, // recompute the logo's centred start on resize
      onUpdate: function (self) {
        var light = self.progress > 0.62;
        stage.classList.toggle("is-light", light);
        nav.classList.toggle("on-dark", !light);
        // white mark on the dark stage, dark mark once the stage turns light —
        // the logo itself never fades, it only recolours
        if (heroLogo) heroLogo.style.filter = light ? "none" : "invert(1)";
        // reveal the nav buttons + bar only once the logo has settled (~0.5);
        // this toggles back on the way up too, so the reverse motion matches
        nav.classList.toggle("pre-logo", self.progress < 0.5);
      },
      onLeave: function () { nav.classList.remove("on-dark", "pre-logo"); },
      onEnterBack: function () { nav.classList.add("on-dark"); }
    }
  });
  heroTl
    // ONE continuous glide: big & centred on landing → shrinks and travels to
    // the nav corner (x:0, y:0, scale:1 = its CSS resting spot). No opacity, no
    // hand-off — so scrolling back up reverses the exact same motion smoothly.
    .fromTo("#hero-logo",
      { scale: bigScale, x: logoStartX, y: logoStartY },
      { scale: 1, x: 0, y: 0, ease: "power1.inOut", duration: 0.5 }, 0)
    // Cristina rises: only her head shows at first, then her whole body moves up
    .fromTo("#hero-cutout",
      { xPercent: heroCutX, y: function () { return mob() ? "16vh" : "32vh"; },
        filter: "brightness(0.9) drop-shadow(0 30px 60px rgba(10,16,11,0.4))" },
      { xPercent: heroCutX, y: function () { return mob() ? "-18vh" : "0vh"; }, filter: "brightness(1) drop-shadow(0 30px 60px rgba(10,16,11,0.4))", ease: "none", duration: 0.52 }, 0)
    .to(".scroll-hint", { opacity: 0, ease: "none", duration: 0.12 }, 0.1)
    // "It simply looks like you." revealed only once she is up (hidden until now)
    .fromTo("#hero-line2",
      { opacity: 0, y: 30, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", ease: "none", duration: 0.16 }, 0.52)
    // the stage warms to light; she brightens
    .to(".hero-stage", { backgroundColor: "#f0f4f8", ease: "none", duration: 0.14 }, 0.64)
    .to("#hero-cutout", { filter: "brightness(1.03) drop-shadow(0 30px 60px rgba(44,54,44,0.18))", ease: "none", duration: 0.14 }, 0.64)
    // line 2 gives way; she glides right; the intro copy + CTAs come in on the left
    .to("#hero-line2", { opacity: 0, y: -30, ease: "none", duration: 0.08 }, 0.8)
    .to("#hero-cutout", { x: function () { return mob() ? "0vw" : "24vw"; }, ease: "none", duration: 0.16 }, 0.82)
    .fromTo("#hero-intro",
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, ease: "none", duration: 0.14 }, 0.86)
    .to({}, { duration: 0.08 }); // held beat before the hero releases
  }

  /* ---------- method: stepped reveals ---------- */
  var steps = gsap.utils.toArray(".method-step");
  var analysisVideo = document.getElementById("analysis-video");
  function setActiveStep(p) {
    var idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    steps.forEach(function (s, i) { s.classList.toggle("is-active", i === idx); });
  }
  if (mob()) {
    /* PHONES: no pin. The pinned content is far taller than the screen, so the
       highlight used to advance off-screen while the section sat frozen. Instead
       let the section scroll naturally and light each line (Scan → Measure →
       Plan) as it passes through the middle of the viewport. */
    ScrollTrigger.create({
      trigger: ".method-steps",
      start: "top 72%",     // first line lights up as it reaches mid-screen
      end: "bottom 55%",    // last line is lit by the time it leaves
      onUpdate: function (self) { setActiveStep(self.progress); },
      onLeaveBack: function () { steps.forEach(function (s) { s.classList.remove("is-active"); }); }
    });
  } else {
    /* DESKTOP: video + steps sit side by side, so pin the pair and scrub the
       highlight — everything stays visible while pinned. */
    ScrollTrigger.create({
      trigger: ".method",
      start: "top top",
      end: "+=70%",
      pin: ".method-pin",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: function (self) { setActiveStep(self.progress); },
      onEnterBack: function () { if (analysisVideo && analysisVideo.paused) analysisVideo.play().catch(function () {}); }
    });
  }
  /* The video simply eases in — a plain fade with a whisper of scale, played
     once and finished well before the section pins. Deliberately NOT scrubbed
     and with no vertical movement: the old scrubbed y-tween fought the pin as
     it engaged, which is what caused the jump. */
  gsap.from(".method-media", {
    scrollTrigger: { trigger: ".method", start: "top 78%" },
    opacity: 0, scale: 1.03,
    duration: 1.3, ease: "power2.out"
  });

  /* the clip starts from the beginning as the section comes into view */
  ScrollTrigger.create({
    trigger: ".method",
    start: "top 78%",
    onEnter: function () { if (analysisVideo) { analysisVideo.currentTime = 0; analysisVideo.play().catch(function () {}); } },
    onEnterBack: function () { if (analysisVideo) { analysisVideo.currentTime = 0; analysisVideo.play().catch(function () {}); } }
  });

  /* ---------- story: line-by-line reveal + route draw ---------- */
  // the story now fits one screen, so the lines reveal together as a stagger
  // rather than each being scrubbed individually (which would leave the lower
  // ones invisible once the whole section is already in view)
  gsap.from(".story-line", {
    scrollTrigger: { trigger: ".story", start: "top 65%" },
    y: 30, opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.12
  });
  /* the route draws itself: each city drops in, then the line runs on to the
     next one, so the journey reads as a journey rather than three words */
  var routeTl = gsap.timeline({
    scrollTrigger: { trigger: ".story-route", start: "top 82%" }
  });
  var cities = gsap.utils.toArray(".story-route span");
  var legs = gsap.utils.toArray(".story-route i");
  cities.forEach(function (city, i) {
    routeTl.from(city, { opacity: 0, y: 14, duration: 0.45, ease: "power2.out" }, i === 0 ? 0 : ">-0.1");
    if (legs[i]) routeTl.from(legs[i], { scaleX: 0, duration: 0.5, ease: "power1.inOut" }, ">-0.15");
  });
  // the destination marker pulses once it is reached
  routeTl.fromTo(cities[cities.length - 1],
    { scale: 1 },
    { scale: 1.06, duration: 0.28, yoyo: true, repeat: 1, ease: "power2.inOut", transformOrigin: "left center" });
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
      /* Anchored to the PHOTO itself (never the surrounding block, whose
         height varies with how much text a case has, which made the timing
         drift). The before is held while the photo rises into view, then the
         wipe sweeps and is fully complete by the time the photo reaches the
         middle of the screen — finishing at 55% leaves a small safety margin
         so the after is never still sweeping once the case is centred. */
      scrollTrigger: {
        trigger: block.querySelector(".ba"),
        start: "center 80%",
        end: "center 55%",
        scrub: true
      },
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

  gsap.from(".loc", {
    scrollTrigger: { trigger: ".locations", start: "top 82%" },
    y: 40, opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.14
  });

  /* ---------- consultation reveal ---------- */
  gsap.from(".consult-copy, .consult-form", {
    scrollTrigger: { trigger: ".consult", start: "top 75%" },
    y: 60, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.15
  });

  /* refresh once everything (fonts, images) is in */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
