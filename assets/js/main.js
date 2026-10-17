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

  /* ---------- consultation form: sent straight away, no email app ----------
     The form posts to a small n8n workflow (its address is in the form's
     data-endpoint). Until that address is filled in, it falls back to opening
     an email draft, so nothing breaks. */
  var form = document.getElementById("consult-form");
  if (form) {
    // the form's own messages follow the page language (<html lang="ro"> on the Romanian pages)
    var ro = document.documentElement.lang === "ro";
    var TXT = ro ? {
      thanks: "Vă mulțumim", thanksBody1: "Mesajul dumneavoastră a ajuns la noi. Vă vom răspunde la ", thanksBody2: " cât mai curând posibil.",
      err1: "Ne cerem scuze, mesajul nu a fost trimis. Vă rugăm să ne scrieți pe ", err2: " sau la ",
      send: "Solicitați o consultație", sending: "Se trimite…", subject: "Solicitare de consultație — "
    } : {
      thanks: "Thank you", thanksBody1: "Your message has reached us. We will reply to ", thanksBody2: " as soon as we can.",
      err1: "Sorry, that did not go through. Please message us on ", err2: " or write to ",
      send: "Request a consultation", sending: "Sending…", subject: "Consultation request — "
    };
    var shownAt = Date.now();
    var statusEl = form.querySelector(".form-status");
    var sendBtn = form.querySelector('button[type="submit"]');

    // a friendly thank-you that replaces the form
    var showThanks = function (name, email) {
      var box = document.createElement("div");
      box.className = "form-thanks";
      var h = document.createElement("h3");
      h.textContent = TXT.thanks + (name ? ", " + name : "") + ".";
      var p = document.createElement("p");
      p.textContent = TXT.thanksBody1 + email + TXT.thanksBody2;
      box.appendChild(h); box.appendChild(p);
      form.replaceChildren(box);
    };

    // a calm error that points to the other ways to reach us
    var showError = function () {
      statusEl.textContent = "";
      statusEl.appendChild(document.createTextNode(TXT.err1));
      var wa = document.createElement("a");
      wa.href = "https://wa.me/40759949353"; wa.textContent = "WhatsApp";
      wa.target = "_blank"; wa.rel = "noopener";
      statusEl.appendChild(wa);
      statusEl.appendChild(document.createTextNode(TXT.err2));
      var em = document.createElement("a");
      em.href = "mailto:info@cpdentalaesthetics.com"; em.textContent = "info@cpdentalaesthetics.com";
      statusEl.appendChild(em);
      statusEl.appendChild(document.createTextNode("."));
      sendBtn.disabled = false;
      sendBtn.textContent = TXT.send;
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      var endpoint = (form.getAttribute("data-endpoint") || "").trim();

      // spam robots fill the hidden field or submit within a second or two:
      // pretend it worked, send nothing
      if (form.elements.website.value || Date.now() - shownAt < 2500) {
        showThanks(name, email);
        return;
      }

      // no workflow address yet: open an email draft, as before
      if (!endpoint) {
        var subject = TXT.subject + name;
        var body = message + "\n\n— " + name + " (" + email + ")";
        window.location.href =
          "mailto:info@cpdentalaesthetics.com?subject=" +
          encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        return;
      }

      statusEl.textContent = "";
      sendBtn.disabled = true;
      sendBtn.textContent = TXT.sending;
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name, email: email, message: message,
          consent: true, page: location.href, lang: document.documentElement.lang, sentAt: new Date().toISOString()
        }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        clearTimeout(timer);
        if (res.ok) showThanks(name, email); else showError();
      }).catch(function () {
        clearTimeout(timer);
        showError();
      });
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
      // buttons jump straight to the section, no long glide. The pinned sections add height as
      // the page scrolls, so the jump re-checks its landing spot a few frames and corrects itself.
      if (target) {
        e.preventDefault();
        var tries = 0;
        (function jump() {
          lenis.resize();   // refresh Lenis' idea of the page length (the pins make it longer than it first thinks)
          lenis.scrollTo(target.getBoundingClientRect().top + window.scrollY, { immediate: true, force: true });
          requestAnimationFrame(function () {
            if (Math.abs(target.getBoundingClientRect().top) > 2 && ++tries < 8) jump();
          });
        })();
      }
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

  // Timeline-time moments the page chrome switches on (see the heroTl below).
  // LIGHT_AT: middle of the stage's fade to white (0.64 to 0.78), where a white
  //   logo and a dark logo have about equal contrast against the grey stage.
  // NAV_READY_AT: just after the logo has landed in the nav corner (0.5).
  var LIGHT_AT = 0.71;
  var NAV_READY_AT = 0.54;

  var heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      // phones scroll through the hero 30% faster (shorter pin distance)
      end: function () { return mob() ? "+=252%" : "+=360%"; },
      pin: ".hero-stage",
      scrub: true,
      refreshPriority: 2,        // HIGHER number = refreshed FIRST: hero, then method, then the rest, so later triggers count its pin spacing
      invalidateOnRefresh: true, // recompute the logo's centred start on resize
      onUpdate: function (self) {
        // Read the TIMELINE's own clock, not scroll progress: the timeline runs
        // 0 to 1.08 (the last 0.08 is the held beat), so progress and timeline
        // time don't line up and switches keyed to progress fire early.
        var t = self.animation.time();
        var light = t > LIGHT_AT;
        stage.classList.toggle("is-light", light);
        nav.classList.toggle("on-dark", !light);
        // white mark on the dark stage, dark mark once the stage turns light —
        // the logo itself never fades, it only recolours
        if (heroLogo) heroLogo.style.filter = light ? "none" : "invert(1)";
        // reveal the nav buttons + bar only once the logo has settled (~0.5);
        // this toggles back on the way up too, so the reverse motion matches
        nav.classList.toggle("pre-logo", t < NAV_READY_AT);
      },
      onLeave: function () { nav.classList.remove("on-dark", "pre-logo"); },
      // GSAP runs onUpdate BEFORE onEnterBack, so adding "on-dark" here blindly
      // left the nav dark when scrolling back up into the already-light hero.
      // Use the same timeline-clock rule as onUpdate instead.
      onEnterBack: function (self) {
        nav.classList.toggle("on-dark", self.animation.time() <= LIGHT_AT);
      }
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
    // the title appears only once she is up (hidden until now)
    .fromTo("#hero-line2",
      { opacity: 0, y: 30, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", ease: "none", duration: 0.16 }, 0.52)
    // the stage warms to light; she brightens
    .to(".hero-wash", { opacity: 1, ease: "none", duration: 0.14 }, 0.64)
    .to("#hero-cutout", { filter: "brightness(1.03) drop-shadow(0 30px 60px rgba(44,54,44,0.18))", ease: "none", duration: 0.14 }, 0.64);

  if (!mob()) {
    // DESKTOP: the title does not fade away. Both lines shrink and slide to the left
    // until they sit exactly where the intro heading lives, then the paragraph arrives under them.
    var introEl = document.getElementById("hero-intro");
    var slotEl = document.getElementById("hero-intro-title");
    var h2El = document.getElementById("hero-line2");
    var lineFs = function () { return parseFloat(getComputedStyle(slotEl).fontSize); };
    var landX = function (i, el) {
      return introEl.offsetLeft + slotEl.offsetLeft - (h2El.offsetLeft + el.offsetLeft);
    };
    var landY = function (i, el) {
      var lh = lineFs() * 1.05;
      return (introEl.offsetTop - introEl.offsetHeight / 2 + slotEl.offsetTop + i * lh) - (h2El.offsetTop + el.offsetTop);
    };
    var landScale = function (i, el) { return lineFs() / parseFloat(getComputedStyle(el).fontSize); };
    heroTl
      // white on the dark stage turns to ink as the stage lightens
      .to("#hero-line2 .hl", { color: "#2c3036", textShadow: "0 0 0 rgba(0,0,0,0)", ease: "none", duration: 0.12 }, 0.72)
      .to("#hero-line2 .hl em", { color: "#6b8e23", ease: "none", duration: 0.12 }, 0.72)
      .to("#hero-line2 .hl", { x: landX, y: landY, scale: landScale, ease: "power2.inOut", duration: 0.22 }, 0.78)
      .to("#hero-cutout", { x: "24vw", ease: "none", duration: 0.18 }, 0.8)
      .fromTo("#hero-intro", { opacity: 0 }, { opacity: 1, ease: "none", duration: 0.12 }, 0.94);
  } else {
    // PHONES: unchanged, the title fades and the intro comes in
    heroTl
      .to("#hero-line2", { opacity: 0, y: -30, ease: "none", duration: 0.08 }, 0.8)
      .to("#hero-cutout", { x: "0vw", ease: "none", duration: 0.16 }, 0.82)
      .fromTo("#hero-intro", { opacity: 0, x: -40 }, { opacity: 1, x: 0, ease: "none", duration: 0.14 }, 0.86);
  }
  heroTl
    .to({}, { duration: 0.08 }); // held beat before the hero releases
  }

  /* ---------- method: stepped reveals ---------- */
  var steps = gsap.utils.toArray(".method-step");
  var analysisVideo = document.getElementById("analysis-video");
  function setActiveStep(p) {
    var idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    steps.forEach(function (s, i) { s.classList.toggle("is-active", i === idx); });
  }
  function clearSteps() { steps.forEach(function (s) { s.classList.remove("is-active"); }); }

  /* Phone vs desktop is chosen with gsap.matchMedia, so it is decided again
     whenever the window is resized or a tablet is rotated (it used to be decided
     once, at page load). When a query stops matching, GSAP removes that mode's
     trigger and its pin spacer for us; the function each mode returns is its
     extra clean-up. "not all and (max-width: 760px)" is the exact opposite of the
     phone query, so there is never a gap or an overlap (same split as mob()). */
  var mm = gsap.matchMedia();

  mm.add("(max-width: 760px)", function () {
    /* PHONES: no pin. The pinned content is far taller than the screen, so the
       highlight used to advance off-screen while the section sat frozen. Instead
       let the section scroll naturally and light each line (Scan → Measure →
       Plan) as it passes through the middle of the viewport. */
    ScrollTrigger.create({
      trigger: ".method-steps",
      start: "top 72%",     // first line lights up as it reaches mid-screen
      end: "bottom 55%",    // last line is lit by the time it leaves
      refreshPriority: 1,   // higher = refreshed first: after the hero, before the rest
      onUpdate: function (self) { setActiveStep(self.progress); },
      onLeaveBack: clearSteps
    });
    return clearSteps;      // lights off when this mode is switched away from
  });

  mm.add("not all and (max-width: 760px)", function () {
    /* DESKTOP: video + steps sit side by side, so pin the pair. Nothing "jumps" any
       more: a soft highlight glides from step to step as you scroll, the steps fade
       up and down in between, and the video drifts a touch, so every bit of scroll
       moves something (before, the highlight only flipped three times and the rest
       of the pinned scroll felt dead). */
    var stepList = document.querySelector(".method-steps");
    if (!stepList) return;          // pages without the Method section (Services, Cases) have nothing to do here
    var cursor = document.createElement("span");
    cursor.className = "method-cursor";
    cursor.setAttribute("aria-hidden", "true");
    stepList.insertBefore(cursor, stepList.firstChild);
    stepList.classList.add("is-scrub");

    var firstOn = function () { return steps[0]; };
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".method",
        start: "top top",
        end: "+=105%",
        pin: ".method-pin",
        scrub: 0.8,             // the scrub itself is eased, so it never feels stepped
        refreshPriority: 1,     // higher = refreshed first: after the hero, before the rest
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var t = self.animation.time();
          setActiveStep(t < 0.85 ? 0 : (t < 2.05 ? 0.5 : 0.99));   // only recolours the small labels
        },
        onEnterBack: function () { if (analysisVideo && analysisVideo.paused) analysisVideo.play().catch(function () {}); }
      }
    });
    // start: highlight on step 1, the other two softly dimmed
    tl.fromTo(cursor,
      { y: function () { return steps[0].offsetTop; }, height: function () { return steps[0].offsetHeight; }, opacity: 1 },
      { y: function () { return steps[0].offsetTop; }, height: function () { return steps[0].offsetHeight; }, opacity: 1, duration: 0.001 }, 0);
    gsap.set(steps, { opacity: 0.4 });
    gsap.set(steps[0], { opacity: 1 });
    // short pause on step 1, then glide to step 2, a breath, glide to step 3, short pause.
    // The glides are long compared with the pauses, so the highlight is nearly always travelling.
    tl.to({}, { duration: 0.35 }, 0)
      .to(cursor, { y: function () { return steps[1].offsetTop; }, height: function () { return steps[1].offsetHeight; }, ease: "power1.inOut", duration: 0.95 }, 0.35)
      .to(steps[0], { opacity: 0.4, duration: 0.95 }, 0.35)
      .to(steps[1], { opacity: 1, duration: 0.95 }, 0.35)
      .to(cursor, { y: function () { return steps[2].offsetTop; }, height: function () { return steps[2].offsetHeight; }, ease: "power1.inOut", duration: 0.95 }, 1.55)
      .to(steps[1], { opacity: 0.4, duration: 0.95 }, 1.55)
      .to(steps[2], { opacity: 1, duration: 0.95 }, 1.55)
      .to({}, { duration: 0.3 }, 2.5);
    // the video breathes very slightly the whole way, so there is never a still stretch
    tl.fromTo(".method-media video", { scale: 1 }, { scale: 1.045, duration: 2.8 }, 0);
    return function () {
      clearSteps();
      stepList.classList.remove("is-scrub");
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      gsap.set(steps, { clearProps: "opacity" });
      gsap.set(".method-media video", { clearProps: "transform" });
    };
  });
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

  /* ---------- work: the two main cases, side by side ----------
     Quiet and slow: each photo fades up a few pixels (Before first, After a
     beat later) and the picture settles very slightly. A faint drift
     continues while scrolling past. Motion-allowed only. */
  document.querySelectorAll(".case-pair .ba-pair").forEach(function (pair) {
    var figs = pair.querySelectorAll("figure");
    var imgs = pair.querySelectorAll("img");
    gsap.set(imgs, { scale: 1.06 });          // spare picture, so the drift never shows an edge
    gsap.timeline({
      scrollTrigger: {
        trigger: pair, start: "top 85%", once: true
      }
    })
      .from(figs, { y: 26, opacity: 0, duration: 1.9, ease: "power3.out", stagger: 0.45 }, 0)
      .from(imgs, { scale: 1.12, duration: 2.6, ease: "power2.out", stagger: 0.45 }, 0);
    gsap.fromTo(imgs, { yPercent: -2 }, {
      yPercent: 2, ease: "none",
      scrollTrigger: { trigger: pair, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* ---------- work: scroll-driven before/after wipes ---------- */
  gsap.utils.toArray(".case").forEach(function (block) {
    var after = block.querySelector(".ba-after");
    if (!after) return;   // the two main cases show side by side instead (see below)
    var edge = block.querySelector(".ba-edge");
    var labelB = block.querySelector(".ba-label-before");
    var labelA = block.querySelector(".ba-label-after");
    var wipe = { p: 0 };
    // Photo width, kept up to date by a resize watcher instead of being measured
    // on every scroll frame (each measure forces the browser to re-lay-out the
    // page). If the watcher isn't available it stays 0 and we measure live.
    var afterW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () { afterW = after.offsetWidth; }).observe(after);
    }
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
        edge.style.transform = "translateX(" + (pct / 100 * (afterW || after.offsetWidth) - 1) + "px)";
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
  gsap.from(".fcard", {
    scrollTrigger: { trigger: ".featured", start: "top 80%" },
    y: 40, opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.1
  });
  gsap.from(".tcard", {
    scrollTrigger: { trigger: ".testimonials", start: "top 80%" },
    y: 40, opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.08
  });
  gsap.from(".cred", {
    scrollTrigger: { trigger: ".creds", start: "top 85%" },
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

/* ---------- testimonial video pop-up ----------
   The video file is only attached when someone opens the pop-up, so the page
   never downloads it for visitors who don't press play. */
(function () {
  document.querySelectorAll("[data-open]").forEach(function (btn) {
    var dlg = document.getElementById(btn.dataset.open);
    if (!dlg || !dlg.showModal) return;
    var vid = dlg.querySelector("video");
    btn.addEventListener("click", function () {
      if (!vid.getAttribute("src")) vid.setAttribute("src", vid.dataset.src);
      dlg.showModal();
      vid.play().catch(function () {});
    });
    // close on the X, or a click on the dark area outside the video
    dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    // always stop the sound when the pop-up closes (X, Esc, or outside click)
    dlg.addEventListener("close", function () { vid.pause(); });
  });
})();
