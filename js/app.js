(function () {
  const USERS_KEY = "lemodz_users";
  const SESSION_KEY = "lemodz_session";
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; }
  }
  function setSession(u) {
    if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_KEY);
  }
  function isPremium(user) {
    if (!user || !user.isPremium) return false;
    if (!user.premiumUntil) return true;
    return Date.now() < user.premiumUntil;
  }
  let currentUser = getSession();
  let activeCategory = "adminabuse";
  const menu = document.getElementById("side-menu");
  const overlay = document.getElementById("menu-overlay");
  const openBtn = document.getElementById("menu-open");
  const closeBtn = document.getElementById("menu-close");
  const links = document.querySelectorAll(".menu-link");
  const pages = document.querySelectorAll(".page-section");
  const categoryBar = document.getElementById("category-bar");
  const authArea = document.getElementById("auth-area");
  const sideStatus = document.getElementById("side-account-status");
  const listTitle = document.getElementById("list-title");
  const listSub = document.getElementById("list-sub");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("mod-search");
  const lootOverlay = document.getElementById("loot-overlay");
  const lootModal = document.getElementById("loot-modal");
  const lootClose = document.getElementById("loot-close");
  const lootContinue = document.getElementById("loot-continue");
  const lootFileLabel = document.getElementById("loot-file-label");
  const btnDirect = document.getElementById("btn-direct-dl");
  const directLock = document.getElementById("direct-lock");
  const directNote = document.getElementById("direct-note");
  const btnBuyPremium = document.getElementById("btn-buy-premium");
  const authModal = document.getElementById("auth-modal");
  const authClose = document.getElementById("auth-close");
  const formSignin = document.getElementById("form-signin");
  const formSignup = document.getElementById("form-signup");
  const premiumModal = document.getElementById("premium-modal");
  const premiumClose = document.getElementById("premium-close");
  const premiumMsg = document.getElementById("premium-msg");
  let currentDirectUrl = null;
  let currentLabel = "";
  const CAT_META = {
    adminabuse: { title: "Admin Abuse", sub: "Rank systems, shops & staff power" },
    commands: { title: "Commands", sub: "Staff panels, chat & land tools" },
    all: { title: "All mods", sub: "Everything in the LEMODZ library" },
  };
  function toast(message, type) {
    const host = document.getElementById("toast-host");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s";
      setTimeout(function () { el.remove(); }, 300);
    }, 2800);
  }
  function isAnyModalOpen() {
    return (lootModal && !lootModal.hidden) || (authModal && !authModal.hidden) || (premiumModal && !premiumModal.hidden);
  }
  function openMenu() {
    if (!menu) return;
    menu.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    if (!isAnyModalOpen()) document.body.style.overflow = "";
  }
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
  if (menuPremium) {
    menuPremium.addEventListener("click", function (e) {
      e.preventDefault();
      closeMenu();
      openPremiumModal();
    });
  }
  function setCategory(target) {
    activeCategory = target;
    document.querySelectorAll(".cat-btn").forEach(function (b) {
      var on = b.dataset.category === target;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".mod-category").forEach(function (cat) {
      if (target === "all") {
        cat.classList.add("active");
        cat.removeAttribute("hidden");
      } else {
        var match = cat.dataset.category === target;
        cat.classList.toggle("active", match);
        if (match) cat.removeAttribute("hidden");
        else cat.setAttribute("hidden", "");
      }
    });
    var meta = CAT_META[target] || CAT_META.adminabuse;
    if (listTitle) listTitle.textContent = meta.title;
    if (listSub) listSub.textContent = meta.sub;
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
        ? (premium ? currentUser.email + " · Premium" : currentUser.email)
        : "Not signed in";
    }
    if (authArea) {
      if (currentUser) {
        authArea.innerHTML =
          '<span class="auth-chip' + (premium ? " premium" : "") + '">' +
          (currentUser.name || currentUser.email.split("@")[0]) +
          (premium ? " · Premium" : "") +
          '</span><button type="button" class="btn-auth" id="btn-logout">Logout</button>';
        var logoutBtn = document.getElementById("btn-logout");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", function () {
            setSession(null);
            currentUser = null;
            refreshAuthUI();
            updateDirectButton();
            toast("Signed out", "success");
          });
        }
      } else {
        authArea.innerHTML =
          '<button type="button" class="btn-auth" id="btn-signin">Sign In</button>' +
          '<button type="button" class="btn-auth btn-auth-primary" id="btn-signup">Sign Up</button>';
        var si = document.getElementById("btn-signin");
        var su = document.getElementById("btn-signup");
        if (si) si.addEventListener("click", function () { openAuthModal("signin"); });
        if (su) su.addEventListener("click", function () { openAuthModal("signup"); });
      }
    }
    updateDirectButton();
  }
  function updateDirectButton() {
    var ok = isPremium(currentUser);
    if (btnDirect) {
      btnDirect.disabled = !ok;
      if (directLock) directLock.hidden = ok;
      if (directNote) {
        directNote.textContent = ok
          ? "Premium active — download starts immediately."
          : "Requires LEMODZ Premium for instant direct download.";
      }
    }
  }
  function openAuthModal(tab) {
    if (!authModal) return;
    authModal.hidden = false;
    if (lootOverlay) lootOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    switchAuthTab(tab || "signin");
  }
  function closeAuthModal() {
    if (authModal) authModal.hidden = true;
    if (lootOverlay && lootModal && lootModal.hidden && premiumModal && premiumModal.hidden) {
      lootOverlay.hidden = true;
      if (!menu || !menu.classList.contains("open")) document.body.style.overflow = "";
    }
  }
  if (authClose) authClose.addEventListener("click", closeAuthModal);
  function switchAuthTab(tab) {
    document.querySelectorAll(".auth-tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === tab);
    });
    if (formSignin) {
      formSignin.hidden = tab !== "signin";
      formSignin.style.display = tab === "signin" ? "flex" : "none";
    }
    if (formSignup) {
      formSignup.hidden = tab !== "signup";
      formSignup.style.display = tab === "signup" ? "flex" : "none";
    }
    var sm = document.getElementById("signin-msg");
    var um = document.getElementById("signup-msg");
    if (sm) { sm.textContent = ""; sm.classList.remove("error"); }
    if (um) { um.textContent = ""; um.classList.remove("error"); }
  }
  document.querySelectorAll(".auth-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { switchAuthTab(tab.dataset.tab); });
  });
  if (formSignin) {
    formSignin.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (document.getElementById("signin-email") || {}).value || "";
      var password = (document.getElementById("signin-pass") || {}).value || "";
      var msg = document.getElementById("signin-msg");
      var users = getUsers();
      var key = email.trim().toLowerCase();
      var u = users[key];
      if (!u || u.password !== password) {
        if (msg) { msg.textContent = "Invalid email or password."; msg.classList.add("error"); }
        return;
      }
      currentUser = { email: u.email, name: u.name, isPremium: !!u.isPremium, premiumUntil: u.premiumUntil || null };
      setSession(currentUser);
      if (msg) { msg.textContent = "Signed in!"; msg.classList.remove("error"); }
      refreshAuthUI();
      toast("Welcome back!", "success");
      setTimeout(closeAuthModal, 400);
    });
  }
  if (formSignup) {
    formSignup.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("signup-name") || {}).value || "";
      var email = (document.getElementById("signup-email") || {}).value || "";
      var password = (document.getElementById("signup-pass") || {}).value || "";
      var msg = document.getElementById("signup-msg");
      var key = email.trim().toLowerCase();
      var users = getUsers();
      if (users[key]) {
        if (msg) { msg.textContent = "Account already exists. Sign in instead."; msg.classList.add("error"); }
        return;
      }
      users[key] = { email: key, name: name.trim(), password: password, isPremium: false, premiumUntil: null };
      saveUsers(users);
      currentUser = { email: key, name: name.trim(), isPremium: false, premiumUntil: null };
      setSession(currentUser);
      if (msg) { msg.textContent = "Account created!"; msg.classList.remove("error"); }
      refreshAuthUI();
      toast("Account created — you're signed in", "success");
      setTimeout(closeAuthModal, 400);
    });
  }
  function openLootModal(lootUrl, label, directUrl) {
    currentLabel = label || "—";
    currentDirectUrl = directUrl || null;
    if (lootFileLabel) lootFileLabel.textContent = currentLabel;
    if (lootContinue) {
      lootContinue.href = lootUrl && lootUrl !== "#" ? lootUrl : "#";
      lootContinue.style.opacity = lootUrl && lootUrl !== "#" ? "1" : "0.5";
    }
    updateDirectButton();
    if (lootModal) lootModal.hidden = false;
    if (lootOverlay) lootOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLootModal() {
    if (lootModal) lootModal.hidden = true;
    if (lootOverlay && authModal && authModal.hidden && premiumModal && premiumModal.hidden) {
      lootOverlay.hidden = true;
      if (!menu || !menu.classList.contains("open")) document.body.style.overflow = "";
    }
  }
  if (lootClose) lootClose.addEventListener("click", closeLootModal);
  document.querySelectorAll(".loot-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openLootModal(btn.dataset.loot, btn.dataset.label, btn.dataset.direct);
    });
  });
  if (btnDirect) {
    btnDirect.addEventListener("click", function () {
      if (!isPremium(currentUser)) {
        closeLootModal();
        openPremiumModal();
        toast("Premium required for direct download", "error");
        return;
      }
      if (currentDirectUrl) window.location.href = currentDirectUrl;
    });
  }
  if (btnBuyPremium) {
    btnBuyPremium.addEventListener("click", function () {
      closeLootModal();
      openPremiumModal();
    });
  }
  function openPremiumModal() {
    if (premiumModal) premiumModal.hidden = false;
    if (lootOverlay) lootOverlay.hidden = false;
    if (premiumMsg) premiumMsg.textContent = "";
    document.body.style.overflow = "hidden";
  }
  function closePremiumModal() {
    if (premiumModal) premiumModal.hidden = true;
    if (lootOverlay && lootModal && lootModal.hidden && authModal && authModal.hidden) {
      lootOverlay.hidden = true;
      if (!menu || !menu.classList.contains("open")) document.body.style.overflow = "";
    }
  }
  if (premiumClose) premiumClose.addEventListener("click", closePremiumModal);
  var WHOP_CHECKOUT = {
    day: "https://whop.com/checkout/ch_yNDF6JY0TS1O2jl/",
    week: "https://whop.com/checkout/ch_F2KB7UiJcMZEiSi/",
    month: "https://whop.com/checkout/ch_75gZ3WLHi3LAIyo/",
    year: "https://whop.com/checkout/ch_iSnaOuFuChX3Jw5/",
  };
  document.querySelectorAll(".plan-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var plan = card.dataset.plan;
      var days = parseInt(card.dataset.days || "0", 10);
      if (!currentUser) {
        if (premiumMsg) premiumMsg.textContent = "Please Sign In or Sign Up first.";
        closePremiumModal();
        openAuthModal("signup");
        toast("Create an account first", "error");
        return;
      }
      var url = WHOP_CHECKOUT[plan];
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        if (premiumMsg) premiumMsg.textContent = "Complete payment on Whop, then return and Sign In.";
        toast("Opening Whop checkout…", "success");
        return;
      }
      var until = Date.now() + days * 24 * 60 * 60 * 1000;
      currentUser.isPremium = true;
      currentUser.premiumUntil = until;
      setSession(currentUser);
      var users = getUsers();
      if (users[currentUser.email]) {
        users[currentUser.email].isPremium = true;
        users[currentUser.email].premiumUntil = until;
        saveUsers(users);
      }
      if (premiumMsg) premiumMsg.textContent = "Premium activated (demo).";
      refreshAuthUI();
      toast("Premium activated!", "success");
      setTimeout(closePremiumModal, 900);
    });
  });
  function closeAllModals() {
    closeAuthModal();
    closeLootModal();
    closePremiumModal();
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeMenu(); closeAllModals(); }
  });
  refreshAuthUI();
})();
