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

  const menu = document.getElementById("side-menu");
  const overlay = document.getElementById("menu-overlay");
  const openBtn = document.getElementById("menu-open");
  const closeBtn = document.getElementById("menu-close");
  const links = document.querySelectorAll(".menu-link");
  const pages = document.querySelectorAll(".page-section");
  const categoryBar = document.getElementById("category-bar");
  const authArea = document.getElementById("auth-area");
  const sideStatus = document.getElementById("side-account-status");

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
  if (overlay) {
    overlay.addEventListener("click", () => { closeMenu(); closeAllModals(); });
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const page = link.getAttribute("data-page");
      if (!page) return;
      e.preventDefault();
      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      pages.forEach((p) => p.classList.remove("active"));
      const target = document.getElementById("page-" + page);
      if (target) target.classList.add("active");
      if (categoryBar) categoryBar.hidden = page !== "home";
      closeMenu();
    });
  });

  const menuPremium = document.getElementById("menu-premium");
  if (menuPremium) {
    menuPremium.addEventListener("click", (e) => {
      e.preventDefault();
      closeMenu();
      openPremiumModal();
    });
  }

  document.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.category;
      document.querySelectorAll(".cat-btn").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".mod-category").forEach((cat) => {
        const match = cat.dataset.category === target;
        cat.classList.toggle("active", match);
        if (match) cat.removeAttribute("hidden");
        else cat.setAttribute("hidden", "");
      });
    });
  });

  function refreshAuthUI() {
    currentUser = getSession();
    const premium = isPremium(currentUser);
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
        const logoutBtn = document.getElementById("btn-logout");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", () => {
            setSession(null);
            currentUser = null;
            refreshAuthUI();
            updateDirectButton();
          });
        }
      } else {
        authArea.innerHTML =
          '<button type="button" class="btn-auth" id="btn-signin">Sign In</button>' +
          '<button type="button" class="btn-auth btn-auth-primary" id="btn-signup">Sign Up</button>';
        const si = document.getElementById("btn-signin");
        const su = document.getElementById("btn-signup");
        if (si) si.addEventListener("click", () => openAuthModal("signin"));
        if (su) su.addEventListener("click", () => openAuthModal("signup"));
      }
    }
    updateDirectButton();
  }

  function updateDirectButton() {
    const ok = isPremium(currentUser);
    if (btnDirect) {
      btnDirect.disabled = !ok;
      if (directLock) directLock.hidden = ok;
      if (directNote) {
        directNote.textContent = ok
          ? "Premium active — download starts immediately."
          : "Requires LEMODZ Premium.";
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
    document.querySelectorAll(".auth-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tab);
    });
    if (formSignin) formSignin.hidden = tab !== "signin";
    if (formSignup) formSignup.hidden = tab !== "signup";
    const sm = document.getElementById("signin-msg");
    const um = document.getElementById("signup-msg");
    if (sm) sm.textContent = "";
    if (um) um.textContent = "";
  }
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchAuthTab(tab.dataset.tab));
  });

  if (formSignin) {
    formSignin.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = (document.getElementById("signin-email") || {}).value || "";
      const password = (document.getElementById("signin-password") || {}).value || "";
      const msg = document.getElementById("signin-msg");
      const users = getUsers();
      const key = email.trim().toLowerCase();
      const u = users[key];
      if (!u || u.password !== password) {
        if (msg) msg.textContent = "Invalid email or password.";
        return;
      }
      currentUser = { email: u.email, name: u.name, isPremium: !!u.isPremium, premiumUntil: u.premiumUntil || null };
      setSession(currentUser);
      if (msg) msg.textContent = "Signed in!";
      refreshAuthUI();
      setTimeout(closeAuthModal, 500);
    });
  }

  if (formSignup) {
    formSignup.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (document.getElementById("signup-name") || {}).value || "";
      const email = (document.getElementById("signup-email") || {}).value || "";
      const password = (document.getElementById("signup-password") || {}).value || "";
      const msg = document.getElementById("signup-msg");
      const key = email.trim().toLowerCase();
      const users = getUsers();
      if (users[key]) {
        if (msg) msg.textContent = "Account already exists. Sign in instead.";
        return;
      }
      users[key] = { email: key, name: name.trim(), password, isPremium: false, premiumUntil: null };
      saveUsers(users);
      currentUser = { email: key, name: name.trim(), isPremium: false, premiumUntil: null };
      setSession(currentUser);
      if (msg) msg.textContent = "Account created!";
      refreshAuthUI();
      setTimeout(closeAuthModal, 500);
    });
  }

  function openLootModal(lootUrl, label, directUrl) {
    currentLabel = label || "—";
    currentDirectUrl = directUrl || null;
    if (lootFileLabel) lootFileLabel.textContent = currentLabel;
    if (lootContinue) lootContinue.href = lootUrl || "#";
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

  document.querySelectorAll(".loot-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openLootModal(btn.dataset.loot, btn.dataset.label, btn.dataset.direct);
    });
  });

  if (btnDirect) {
    btnDirect.addEventListener("click", () => {
      if (!isPremium(currentUser)) {
        closeLootModal();
        openPremiumModal();
        return;
      }
      if (currentDirectUrl) window.location.href = currentDirectUrl;
    });
  }
  if (btnBuyPremium) {
    btnBuyPremium.addEventListener("click", () => {
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

  const WHOP_CHECKOUT = {
    day: "https://whop.com/checkout/ch_yNDF6JY0TS1O2jl/",
    week: "https://whop.com/checkout/ch_F2KB7UiJcMZEiSi/",
    month: "https://whop.com/checkout/ch_75gZ3WLHi3LAIyo/",
    year: "https://whop.com/checkout/ch_iSnaOuFuChX3Jw5/",
  };

  document.querySelectorAll(".plan-card").forEach((card) => {
    card.addEventListener("click", () => {
      const plan = card.dataset.plan;
      const days = parseInt(card.dataset.days || "0", 10);
      if (!currentUser) {
        if (premiumMsg) premiumMsg.textContent = "Please Sign In or Sign Up first.";
        closePremiumModal();
        openAuthModal("signup");
        return;
      }
      const url = WHOP_CHECKOUT[plan];
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        if (premiumMsg) premiumMsg.textContent = "Complete payment on Whop, then return and Sign In.";
        return;
      }
      const until = Date.now() + days * 24 * 60 * 60 * 1000;
      currentUser.isPremium = true;
      currentUser.premiumUntil = until;
      setSession(currentUser);
      const users = getUsers();
      if (users[currentUser.email]) {
        users[currentUser.email].isPremium = true;
        users[currentUser.email].premiumUntil = until;
        saveUsers(users);
      }
      if (premiumMsg) premiumMsg.textContent = "Premium activated (demo).";
      refreshAuthUI();
      setTimeout(closePremiumModal, 900);
    });
  });

  function closeAllModals() {
    closeAuthModal();
    closeLootModal();
    closePremiumModal();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      closeAllModals();
    }
  });

  refreshAuthUI();
})();
