(function () {
  "use strict";
  const USERS_KEY = "lemodz_users";
  const SESSION_KEY = "lemodz_session";
  function getUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch (e) { return {}; } }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; } }
  function setSession(u) { if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u)); else localStorage.removeItem(SESSION_KEY); }
  function isPremium(user) {
    if (window.LEPremium) return LEPremium.isPremium(user);
    if (!user || !user.isPremium || !user.premiumUntil) return false;
    return Date.now() < user.premiumUntil;
  }
  function isValidLootUrl(url) {
    if (!url) return false;
    var u = String(url).trim();
    if (!u || u === "#" || u === "about:blank") return false;
    return /^https?:\/\//i.test(u);
  }
  var currentUser = getSession();
  var activeCategory = "all";
  var menu = document.getElementById("side-menu");
  var overlay = document.getElementById("menu-overlay");
  var openBtn = document.getElementById("menu-open");
  var closeBtn = document.getElementById("menu-close");
  var links = document.querySelectorAll(".menu-link");
  var pages = document.querySelectorAll(".page-section");
  var categoryBar = document.getElementById("category-bar");
  var authArea = document.getElementById("auth-area");
  var sideStatus = document.getElementById("side-account-status");
  var listTitle = document.getElementById("list-title");
  var listSub = document.getElementById("list-sub");
  var emptyState = document.getElementById("empty-state");
  var searchInput = document.getElementById("mod-search");
  var homeHero = document.querySelector(".home-hero");
  var lootOverlay = document.getElementById("loot-overlay");
  var lootModal = document.getElementById("loot-modal");
  var lootClose = document.getElementById("loot-close");
  var lootContinue = document.getElementById("loot-continue");
  var lootFileLabel = document.getElementById("loot-file-label");
  var btnDirect = document.getElementById("btn-direct-dl");
  var directLock = document.getElementById("direct-lock");
  var directNote = document.getElementById("direct-note");
  var btnBuyPremium = document.getElementById("btn-buy-premium");
  var authModal = document.getElementById("auth-modal");
  var authClose = document.getElementById("auth-close");
  var formSignin = document.getElementById("form-signin");
  var formSignup = document.getElementById("form-signup");
  var premiumModal = document.getElementById("premium-modal");
  var premiumClose = document.getElementById("premium-close");
  var premiumMsg = document.getElementById("premium-msg");
  var currentDirectUrl = null;
  var currentLootUrl = null;
  var currentLabel = "";
  var CAT_META = {
    adminabuse: { title: "Admin Abuse", sub: "Rank systems, shops & staff power" },
    commands: { title: "Commands", sub: "Staff panels, chat & land tools" },
    all: { title: "All mods", sub: "Everything in the LEMODZ library" }
  };
  function toast(message, type) {
    var host = document.getElementById("toast-host");
    if (!host) return;
    var el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity 0.3s"; setTimeout(function () { el.remove(); }, 300); }, 2800);
  }
  function isAnyModalOpen() {
    return (lootModal && !lootModal.hidden) || (authModal && !authModal.hidden) || (premiumModal && !premiumModal.hidden);
  }
  function lockBody(lock) { document.body.style.overflow = lock ? "hidden" : ""; }
  function openMenu() { if (!menu) return; menu.classList.add("open"); if (overlay) overlay.classList.add("open"); lockBody(true); }
  function closeMenu() { if (!menu) return; menu.classList.remove("open"); if (overlay) overlay.classList.remove("open"); if (!isAnyModalOpen()) lockBody(false); }
  if (openBtn) openBtn.addEventListener("click", openMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  if (overlay) overlay.addEventListener("click", function () { closeMenu(); closeAllModals(); });
  links.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var page = link.getAttribute("data-page");
      if (!page) return;
      e.preventDefault();
      links.forEach(function (l) { l.classList.remove("active"); });
      link.classList.add("active");
      pages.forEach(function (p) { p.classList.remove("active"); });
      var target = document.getElementById("page-" + page);
      if (target) target.classList.add("active");
      if (categoryBar) categoryBar.hidden = page !== "home";
      closeMenu();
    });
  });
  var menuPremium = document.getElementById("menu-premium");
  if (menuPremium) menuPremium.addEventListener("click", function (e) { e.preventDefault(); closeMenu(); openPremiumModal(); });
  function setCategory(target) {
    activeCategory = target;
    document.querySelectorAll(".cat-btn").forEach(function (b) {
      var on = b.dataset.category === target;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".mod-category").forEach(function (cat) {
      if (target === "all") { cat.classList.add("active"); cat.removeAttribute("hidden"); }
      else {
        var match = cat.dataset.category === target;
        cat.classList.toggle("active", match);
        if (match) cat.removeAttribute("hidden"); else cat.setAttribute("hidden", "");
      }
    });
    var meta = CAT_META[target] || CAT_META.all;
    if (listTitle) listTitle.textContent = meta.title;
    if (listSub) listSub.textContent = meta.sub;
    if (homeHero) homeHero.classList.toggle("hero-compact", target !== "all");
    applySearch();
  }
  document.querySelectorAll(".cat-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { setCategory(btn.dataset.category); });
  });
  function applySearch() {
    var q = (searchInput && searchInput.value || "").trim().toLowerCase();
    var visible = 0;
    document.querySelectorAll(".mod-card").forEach(function (card) {
      var cat = card.closest(".mod-category");
      var catOk = activeCategory === "all" || (cat && cat.dataset.category === activeCategory);
      var text = (card.dataset.search || card.textContent || "").toLowerCase();
      var match = !q || text.indexOf(q) !== -1;
      var show = catOk && match;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (emptyState) emptyState.classList.toggle("visible", visible === 0);
  }
  if (searchInput) searchInput.addEventListener("input", applySearch);
  function refreshAuthUI() {
    currentUser = getSession();
    var premium = isPremium(currentUser);
    if (sideStatus) {
      sideStatus.textContent = currentUser
        ? ((currentUser.leid || currentUser.email) + (premium ? " · Premium" : ""))
        : "Not signed in";
    }
    var leidStatus = document.getElementById("side-leid-status");
    if (leidStatus) {
      if (currentUser && currentUser.leid) { leidStatus.hidden = false; leidStatus.textContent = "LEID linked · OfficialLEWeb"; }
      else { leidStatus.hidden = true; leidStatus.textContent = ""; }
    }
    var banner = document.getElementById("leid-banner");
    var bannerText = document.getElementById("leid-banner-text");
    if (banner && bannerText) {
      banner.hidden = false;
      bannerText.textContent = (currentUser && currentUser.leid)
        ? (currentUser.leid + (premium ? " · Premium" : ""))
        : "Not linked — Sign in with LEID";
    }
    if (authArea) {
      if (currentUser) {
        var display = currentUser.leid || currentUser.name || (currentUser.email || "").split("@")[0];
        authArea.innerHTML = '<span class="auth-chip' + (premium ? " premium" : "") + '">' + display + (premium ? " · Premium" : "") + '</span><button type="button" class="btn-auth" id="btn-logout">Logout</button>';
        var logoutBtn = document.getElementById("btn-logout");
        if (logoutBtn) logoutBtn.addEventListener("click", function () {
          setSession(null); currentUser = null; refreshAuthUI(); updateDirectButton(); toast("Signed out", "success");
        });
      } else {
        authArea.innerHTML = '<button type="button" class="btn-auth" id="btn-signin">Sign In</button><button type="button" class="btn-auth btn-auth-primary" id="btn-signup">Sign Up</button>';
        var si = document.getElementById("btn-signin");
        var su = document.getElementById("btn-signup");
        if (si) si.addEventListener("click", function () { openAuthModal("signin"); });
        if (su) su.addEventListener("click", function () { openAuthModal("signup"); });
      }
    }
    updateDirectButton();
  }
  function updateDirectButton() {
    currentUser = getSession();
    var ok = isPremium(currentUser);
    if (btnDirect) {
      btnDirect.disabled = !ok;
      if (directLock) directLock.hidden = ok;
      if (directNote) directNote.textContent = ok ? "Premium active — download starts immediately." : "Requires LEMODZ Premium for instant direct download.";
    }
  }
  function updateLootButton() {
    if (!lootContinue) return;
    var hasFile = !!(currentDirectUrl && String(currentDirectUrl).length > 1);
    lootContinue.removeAttribute("href");
    lootContinue.setAttribute("role", "button");
    lootContinue.style.cursor = "pointer";
    lootContinue.textContent = "Watch Ad & Download";
    if (hasFile) {
      lootContinue.classList.remove("is-disabled");
      lootContinue.setAttribute("aria-disabled", "false");
      lootContinue.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        var file = currentDirectUrl;
        var m = String(file).match(/[?&]file=([^&]+)/);
        var fname = m ? decodeURIComponent(m[1]) : String(file).replace(/^.*\//, "");
        if (!fname || fname === "#" || fname === "download.html") { toast("Download file not set", "error"); return; }
        var q = "file=" + encodeURIComponent(fname);
        if (currentLabel) q += "&label=" + encodeURIComponent(currentLabel);
        window.location.assign("/ad.html?" + q);
      };
    } else {
      lootContinue.classList.add("is-disabled");
      lootContinue.setAttribute("aria-disabled", "true");
      lootContinue.onclick = function (e) { e.preventDefault(); toast("Download file not set", "error"); };
    }
  }
  function openAuthModal(tab) {
    if (!authModal) return;
    authModal.hidden = false;
    if (lootOverlay) lootOverlay.hidden = false;
    lockBody(true);
    switchAuthTab(tab || "signin");
  }
  function closeAuthModal() {
    if (authModal) authModal.hidden = true;
    if (lootOverlay && lootModal && lootModal.hidden && premiumModal && premiumModal.hidden) {
      lootOverlay.hidden = true;
      if (!menu || !menu.classList.contains("open")) lockBody(false);
    }
  }
  if (authClose) authClose.addEventListener("click", closeAuthModal);
  function switchAuthTab(tab) {
    document.querySelectorAll(".auth-tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === tab); });
    if (formSignin) { formSignin.hidden = tab !== "signin"; formSignin.style.display = tab === "signin" ? "flex" : "none"; }
    if (formSignup) { formSignup.hidden = tab !== "signup"; formSignup.style.display = tab === "signup" ? "flex" : "none"; }
    var sm = document.getElementById("signin-msg"); var um = document.getElementById("signup-msg");
    if (sm) { sm.textContent = ""; sm.classList.remove("error"); }
    if (um) { um.textContent = ""; um.classList.remove("error"); }
  }
  document.querySelectorAll(".auth-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { switchAuthTab(tab.dataset.tab); });
  });
  if (formSignin) {
    formSignin.addEventListener("submit", function (e) {
      e.preventDefault();
      var leid = (document.getElementById("signin-leid") || {}).value || "";
      var password = (document.getElementById("signin-pass") || {}).value || "";
      var msg = document.getElementById("signin-msg");
      var users = getUsers();
      var key = leid.trim().toLowerCase();
      var u = users[key];
      if (!u || (u.password && u.password !== password)) {
        if (msg) { msg.textContent = "Invalid LEID or password."; msg.classList.add("error"); }
        return;
      }
      currentUser = { leid: u.leid || leid.trim(), email: u.email || key + "@leid.local", name: u.name || u.leid || leid.trim(), isPremium: !!u.isPremium, premiumUntil: u.premiumUntil || null, redeemedCodes: u.redeemedCodes || [], facebookId: u.facebookId || null, linkedOfficialLEWeb: true };
      setSession(currentUser);
      if (msg) { msg.textContent = "Signed in as " + currentUser.leid + "!"; msg.classList.remove("error"); }
      refreshAuthUI();
      toast("Welcome " + currentUser.leid + (isPremium(currentUser) ? " · Premium" : "!"), "success");
      setTimeout(closeAuthModal, 350);
    });
  }
  if (formSignup) {
    formSignup.addEventListener("submit", function (e) {
      e.preventDefault();
      var leid = (document.getElementById("signup-leid") || {}).value || "";
      var name = (document.getElementById("signup-name") || {}).value || "";
      var password = (document.getElementById("signup-pass") || {}).value || "";
      var confirm = (document.getElementById("signup-confirm") || {}).value || "";
      var msg = document.getElementById("signup-msg");
      var key = leid.trim().toLowerCase();
      var users = getUsers();
      if (!key) { if (msg) { msg.textContent = "Please enter a LEID."; msg.classList.add("error"); } return; }
      if (password.length < 4) { if (msg) { msg.textContent = "Password must be at least 4 characters."; msg.classList.add("error"); } return; }
      if (password !== confirm) { if (msg) { msg.textContent = "Passwords do not match."; msg.classList.add("error"); } return; }
      if (users[key]) { if (msg) { msg.textContent = "This LEID is already taken. Sign in instead."; msg.classList.add("error"); } return; }
      users[key] = { leid: leid.trim(), email: key + "@leid.local", name: (name.trim() || leid.trim()), password: password, isPremium: false, premiumUntil: null, redeemedCodes: [], facebookId: null, linkedOfficialLEWeb: true, createdAt: Date.now() };
      saveUsers(users);
      currentUser = { leid: leid.trim(), email: key + "@leid.local", name: name.trim() || leid.trim(), isPremium: false, premiumUntil: null, redeemedCodes: [], linkedOfficialLEWeb: true };
      setSession(currentUser);
      if (msg) { msg.textContent = "Account created!"; msg.classList.remove("error"); }
      refreshAuthUI();
      toast("LEID " + currentUser.leid + " created", "success");
      setTimeout(closeAuthModal, 350);
    });
  }
  function openLootModal(lootUrl, label, directUrl) {
    currentLabel = label || "—";
    if (directUrl && String(directUrl).indexOf("http") !== 0) {
      var d = String(directUrl).replace(/^\.\//, "");
      currentDirectUrl = d.charAt(0) === "/" ? d : "/" + d;
    } else currentDirectUrl = directUrl || null;
    currentLootUrl = lootUrl || null;
    if (lootFileLabel) lootFileLabel.textContent = currentLabel;
    updateLootButton(); updateDirectButton();
    if (lootModal) lootModal.hidden = false;
    if (lootOverlay) lootOverlay.hidden = false;
    lockBody(true);
  }
  function closeLootModal() {
    if (lootModal) lootModal.hidden = true;
    if (lootOverlay && authModal && authModal.hidden && premiumModal && premiumModal.hidden) {
      lootOverlay.hidden = true;
      if (!menu || !menu.classList.contains("open")) lockBody(false);
    }
  }
  if (lootClose) lootClose.addEventListener("click", closeLootModal);
  document.querySelectorAll(".loot-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) { e.preventDefault(); openLootModal(btn.dataset.loot, btn.dataset.label, btn.dataset.direct); });
  });
  if (btnDirect) {
    btnDirect.addEventListener("click", function () {
      currentUser = getSession();
      if (!isPremium(currentUser)) { closeLootModal(); openPremiumModal(); toast("Premium required for direct download", "error"); return; }
      if (currentDirectUrl) {
        var url = currentDirectUrl;
        if (url.indexOf("http") !== 0 && url.charAt(0) !== "/") url = "/" + url;
        window.location.assign(url);
      } else toast("Direct file path missing", "error");
    });
  }
  if (btnBuyPremium) btnBuyPremium.addEventListener("click", function () { closeLootModal(); openPremiumModal(); });
  function openPremiumModal() {
    if (premiumModal) premiumModal.hidden = false;
    if (lootOverlay) lootOverlay.hidden = false;
    if (premiumMsg) { premiumMsg.textContent = ""; premiumMsg.classList.remove("error"); }
    lockBody(true);
    currentUser = getSession();
    if (window.LEPremium) {
      var el = document.getElementById("premium-countdown");
      var note = document.getElementById("premium-lock-note");
      var user = LEPremium.getSession();
      var active = LEPremium.isPremium(user);
      var ms = LEPremium.remainingMs(user);
      if (el) {
        if (active && ms > 0) { el.hidden = false; el.innerHTML = '<span class="cd-label">Premium</span> <span class="cd-time">' + LEPremium.formatCountdown(ms) + '</span>'; }
        else { el.hidden = true; el.innerHTML = ""; }
      }
      var plans = document.querySelector(".premium-plans");
      var redeem = document.querySelector(".code-redeem");
      if (plans) { plans.classList.remove("is-locked"); plans.querySelectorAll(".plan-card").forEach(function (c) { c.disabled = false; }); }
      if (redeem) {
        redeem.classList.remove("is-locked");
        var ci = document.getElementById("premium-code"); var br = document.getElementById("btn-redeem-code");
        if (ci) ci.disabled = false; if (br) br.disabled = false;
      }
      if (note) {
        if (active && ms > 0) { note.hidden = false; note.textContent = "Premium active. Buy or redeem again to add more time."; }
        else note.hidden = true;
      }
    }
  }
  function closePremiumModal() {
    if (premiumModal) premiumModal.hidden = true;
    if (lootOverlay && lootModal && lootModal.hidden && authModal && authModal.hidden) {
      lootOverlay.hidden = true;
      if (!menu || !menu.classList.contains("open")) lockBody(false);
    }
  }
  if (premiumClose) premiumClose.addEventListener("click", closePremiumModal);
  if (window.LEPremium) {
    LEPremium.bindUI({
      countdownEl: document.getElementById("premium-countdown"),
      plansWrap: document.querySelector(".premium-plans"),
      redeemWrap: document.querySelector(".code-redeem"),
      codeInput: document.getElementById("premium-code"),
      btnRedeem: document.getElementById("btn-redeem-code"),
      msgEl: document.getElementById("premium-msg"),
      lockNote: document.getElementById("premium-lock-note"),
      onNeedAuth: function () { closePremiumModal(); openAuthModal("signin"); },
      onToast: function (msg, type) { toast(msg, type); },
      onRedeemed: function () { currentUser = LEPremium.getSession(); refreshAuthUI(); updateDirectButton(); setTimeout(closePremiumModal, 900); }
    });
    LEPremium.onPremiumChange(function (user) { currentUser = user; refreshAuthUI(); updateDirectButton(); });
  }
  function closeAllModals() { closeAuthModal(); closeLootModal(); closePremiumModal(); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); closeAllModals(); } });
  function acceptLeidFromHub(leid, via) {
    if (!leid) return;
    var users = getUsers();
    var key = String(leid).trim().toLowerCase();
    if (!users[key]) {
      users[key] = { leid: String(leid).trim(), email: key + "@leid.local", name: String(leid).trim(), password: null, isPremium: false, premiumUntil: null, redeemedCodes: [], linkedOfficialLEWeb: true, createdAt: Date.now() };
      saveUsers(users);
    } else {
      users[key].linkedOfficialLEWeb = true;
      users[key].leid = users[key].leid || String(leid).trim();
      saveUsers(users);
    }
    var u = users[key];
    currentUser = { leid: u.leid, email: u.email, name: u.name || u.leid, isPremium: !!u.isPremium, premiumUntil: u.premiumUntil || null, redeemedCodes: u.redeemedCodes || [], linkedOfficialLEWeb: true, via: via || "officialleweb" };
    setSession(currentUser);
    refreshAuthUI();
    toast("LEID " + currentUser.leid + " linked to LEMODZ", "success");
  }
  var btnContinueLeid = document.getElementById("btn-continue-leid");
  if (btnContinueLeid) {
    btnContinueLeid.addEventListener("click", function () {
      var leid = prompt("Enter your OfficialLEWeb LEID to continue on LEMODZ:");
      if (!leid) return;
      var pass = prompt("Enter your LEID password (or leave blank if Facebook-only):");
      var users = getUsers();
      var key = leid.trim().toLowerCase();
      var u = users[key];
      if (u && u.password && pass !== null && u.password !== pass) { toast("Wrong password for that LEID", "error"); return; }
      if (!u) {
        users[key] = { leid: leid.trim(), email: key + "@leid.local", name: leid.trim(), password: pass || null, isPremium: false, premiumUntil: null, redeemedCodes: [], linkedOfficialLEWeb: true, createdAt: Date.now() };
        saveUsers(users);
      }
      acceptLeidFromHub(leid.trim(), "continue");
      closeAuthModal();
    });
  }
  function simulateFacebook(isRegister) {
    var fbName = prompt("Simulated Facebook: enter your Facebook name / username:");
    if (!fbName) return;
    var leid = fbName.trim().replace(/\s+/g, "_");
    var users = getUsers();
    var key = leid.toLowerCase();
    if (isRegister || !users[key]) {
      var pass = prompt("Set a password for LEID \"" + leid + "\" (min 4 chars):");
      if (!pass || pass.length < 4) { toast("Password required (min 4)", "error"); return; }
      users[key] = { leid: leid, email: key + "@leid.local", name: fbName.trim(), password: pass, isPremium: false, premiumUntil: null, redeemedCodes: [], facebookId: "sim_" + key, linkedOfficialLEWeb: true, createdAt: Date.now() };
      saveUsers(users);
    }
    acceptLeidFromHub(leid, "facebook");
    closeAuthModal();
  }
  var btnFbLogin = document.getElementById("btn-fb-login");
  if (btnFbLogin) btnFbLogin.addEventListener("click", function () { simulateFacebook(false); });
  var btnFbReg = document.getElementById("btn-fb-register");
  if (btnFbReg) btnFbReg.addEventListener("click", function () { simulateFacebook(true); });
  try {
    var params = new URLSearchParams(window.location.search);
    var hubLeid = params.get("leid");
    if (hubLeid && params.get("connected") === "1") {
      acceptLeidFromHub(hubLeid, "officialleweb");
      if (window.history && history.replaceState) history.replaceState({}, "", window.location.pathname);
    }
  } catch (err) {}
  if (formSignin) formSignin.style.display = "flex";
  if (formSignup) formSignup.style.display = "none";
  refreshAuthUI();
})();
