(function () {
  // ============================================================
  // LEMODZ — Auth + Premium + Download methods
  // ============================================================

  const STORAGE_USERS = "lemodz_users";
  const STORAGE_SESSION = "lemodz_session";

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_USERS) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_SESSION) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveSession(user) {
    if (user) localStorage.setItem(STORAGE_SESSION, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_SESSION);
  }

  function saveAccount(user) {
    saveSession(user);
  }

  let currentUser = getSession();

  function isPremiumActive(user) {
    if (!user || !user.isPremium) return false;
    if (!user.premiumUntil) return true;
    return Date.now() < user.premiumUntil;
  }

  // DOM
  const menuOpen = document.getElementById("menu-open");
  const menuClose = document.getElementById("menu-close");
  const menu = document.getElementById("side-menu");
  const menuOverlay = document.getElementById("menu-overlay");
  const authChip = document.getElementById("auth-chip");
  const authChipText = document.getElementById("auth-chip-text");
  const btnLogout = document.getElementById("btn-logout");
  const btnSignIn = document.getElementById("btn-sign-in");
  const btnSignUp = document.getElementById("btn-sign-up");

  function openMenu() {
    if (menu) menu.classList.add("open");
    if (menuOverlay) menuOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeMenu() {
    if (menu) menu.classList.remove("open");
    if (menuOverlay) menuOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  if (menuOpen) menuOpen.addEventListener("click", openMenu);
  if (menuClose) menuClose.addEventListener("click", closeMenu);
  if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

  function refreshAuthUI() {
    currentUser = getSession();
    const premium = isPremiumActive(currentUser);
    if (authChip && authChipText) {
      if (currentUser) {
        authChip.hidden = false;
        authChipText.textContent = premium
          ? (currentUser.email.split("@")[0] + " · Premium")
          : currentUser.email.split("@")[0];
        authChip.classList.toggle("premium", premium);
      } else {
        authChip.hidden = true;
      }
    }
    if (btnLogout) btnLogout.hidden = !currentUser;
    if (btnSignIn) btnSignIn.hidden = !!currentUser;
    if (btnSignUp) btnSignUp.hidden = !!currentUser;
  }

  // Auth modal
  const authOverlay = document.getElementById("auth-overlay");
  const authModal = document.getElementById("auth-modal");
  const authClose = document.getElementById("auth-close");
  const authTitle = document.getElementById("auth-title");
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authSubmit = document.getElementById("auth-submit");
  const authMsg = document.getElementById("auth-msg");
  const authSwitch = document.getElementById("auth-switch");
  let authMode = "signin";

  function openAuth(mode) {
    authMode = mode || "signin";
    if (authTitle) authTitle.textContent = authMode === "signup" ? "Sign Up" : "Sign In";
    if (authSubmit) authSubmit.textContent = authMode === "signup" ? "Create Account" : "Sign In";
    if (authSwitch) {
      authSwitch.innerHTML =
        authMode === "signup"
          ? 'Already have an account? <button type="button" id="auth-switch-btn" class="link-btn">Sign In</button>'
          : 'New here? <button type="button" id="auth-switch-btn" class="link-btn">Sign Up</button>';
      const sw = document.getElementById("auth-switch-btn");
      if (sw) sw.addEventListener("click", () => openAuth(authMode === "signup" ? "signin" : "signup"));
    }
    if (authMsg) authMsg.textContent = "";
    if (authForm) authForm.reset();
    if (authOverlay) authOverlay.hidden = false;
    if (authModal) authModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeAuth() {
    if (authOverlay) authOverlay.hidden = true;
    if (authModal) authModal.hidden = true;
    if (!menu || !menu.classList.contains("open")) document.body.style.overflow = "";
  }
  if (authClose) authClose.addEventListener("click", closeAuth);
  if (authOverlay) authOverlay.addEventListener("click", closeAuth);
  if (btnSignIn) btnSignIn.addEventListener("click", () => { closeMenu(); openAuth("signin"); });
  if (btnSignUp) btnSignUp.addEventListener("click", () => { closeMenu(); openAuth("signup"); });
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      saveSession(null);
      currentUser = null;
      refreshAuthUI();
      closeMenu();
    });
  }

  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = (authEmail && authEmail.value || "").trim().toLowerCase();
      const password = (authPassword && authPassword.value) || "";
      if (!email || !password) {
        if (authMsg) authMsg.textContent = "Email and password required.";
        return;
      }
      const users = getUsers();
      if (authMode === "signup") {
        if (users[email]) {
          if (authMsg) authMsg.textContent = "Account already exists. Sign In instead.";
          return;
        }
        users[email] = { email, password, isPremium: false, premiumUntil: null };
        saveUsers(users);
        currentUser = { email, isPremium: false, premiumUntil: null };
        saveAccount(currentUser);
        if (authMsg) authMsg.textContent = "Account created! You are signed in.";
        refreshAuthUI();
        setTimeout(closeAuth, 800);
      } else {
        const u = users[email];
        if (!u || u.password !== password) {
          if (authMsg) authMsg.textContent = "Invalid email or password.";
          return;
        }
        currentUser = {
          email: u.email,
          isPremium: !!u.isPremium,
          premiumUntil: u.premiumUntil || null,
        };
        saveAccount(currentUser);
        if (authMsg) authMsg.textContent = "Signed in.";
        refreshAuthUI();
        setTimeout(closeAuth, 600);
      }
    });
  }

  // Category tabs
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.category;
      document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".mod-card").forEach((card) => {
        const c = card.dataset.category;
        card.style.display = !cat || cat === "all" || c === cat ? "" : "none";
      });
    });
  });

  // Pages
  document.querySelectorAll("[data-page]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      document.querySelectorAll(".page-section").forEach((s) => s.classList.remove("active"));
      const target = document.getElementById("page-" + page);
      if (target) target.classList.add("active");
      document.querySelectorAll(".menu-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      closeMenu();
    });
  });

  // Download modal
  const lootOverlay = document.getElementById("loot-overlay");
  const lootModal = document.getElementById("loot-modal");
  const lootClose = document.getElementById("loot-close");
  const lootFileLabel = document.getElementById("loot-file-label");
  const lootContinue = document.getElementById("loot-continue");
  const lootDirect = document.getElementById("loot-direct");
  const lootPremium = document.getElementById("loot-premium");

  function openLoot(btn) {
    const file = btn.dataset.file || "—";
    const lootUrl = btn.dataset.loot || "#";
    const direct = btn.dataset.direct || "";
    if (lootFileLabel) lootFileLabel.textContent = file;
    if (lootContinue) {
      lootContinue.href = lootUrl;
      lootContinue.style.display = "";
    }
    if (lootDirect) {
      if (direct) {
        lootDirect.dataset.file = direct;
        lootDirect.style.display = "";
      } else {
        lootDirect.style.display = "none";
      }
    }
    if (lootOverlay) lootOverlay.hidden = false;
    if (lootModal) lootModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLoot() {
    if (lootOverlay) lootOverlay.hidden = true;
    if (lootModal) lootModal.hidden = true;
    if (!menu || !menu.classList.contains("open")) document.body.style.overflow = "";
  }
  if (lootClose) lootClose.addEventListener("click", closeLoot);
  if (lootOverlay) lootOverlay.addEventListener("click", closeLoot);

  document.querySelectorAll(".loot-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openLoot(btn);
    });
  });

  if (lootDirect) {
    lootDirect.addEventListener("click", (e) => {
      e.preventDefault();
      if (!isPremiumActive(currentUser)) {
        closeLoot();
        openPremium();
        return;
      }
      const file = lootDirect.dataset.file;
      if (file) window.location.href = "download.html?file=" + encodeURIComponent(file);
    });
  }

  // Premium modal
  const premiumOverlay = document.getElementById("premium-overlay");
  const premiumModal = document.getElementById("premium-modal");
  const premiumClose = document.getElementById("premium-close");
  const premiumMsg = document.getElementById("premium-msg");

  function openPremium() {
    if (premiumOverlay) premiumOverlay.hidden = false;
    if (premiumModal) premiumModal.hidden = false;
    if (premiumMsg) premiumMsg.textContent = "";
    document.body.style.overflow = "hidden";
  }
  function closePremium() {
    if (premiumOverlay) premiumOverlay.hidden = true;
    if (premiumModal) premiumModal.hidden = true;
    if (!menu || !menu.classList.contains("open")) document.body.style.overflow = "";
  }
  if (premiumClose) premiumClose.addEventListener("click", closePremium);
  if (premiumOverlay) premiumOverlay.addEventListener("click", closePremium);
  if (lootPremium) lootPremium.addEventListener("click", (e) => { e.preventDefault(); closeLoot(); openPremium(); });

  // Real Whop checkout URLs (LEMODZ company biz_3MqDjHrWDdPdH4)
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
        closePremium();
        openAuth("signup");
        return;
      }
      const checkoutUrl = WHOP_CHECKOUT[plan];
      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        if (premiumMsg) {
          premiumMsg.textContent =
            "Complete payment on Whop. Then return and refresh — or contact support to activate.";
        }
        return;
      }
      const until = Date.now() + days * 24 * 60 * 60 * 1000;
      currentUser.isPremium = true;
      currentUser.premiumUntil = until;
      saveAccount(currentUser);
      const users = getUsers();
      if (users[currentUser.email]) {
        users[currentUser.email].isPremium = true;
        users[currentUser.email].premiumUntil = until;
        saveUsers(users);
      }
      if (premiumMsg) premiumMsg.textContent = "Premium activated (demo).";
      refreshAuthUI();
      setTimeout(closePremium, 1000);
    });
  });

  function closeAllModals() {
    closeAuth();
    closeLoot();
    closePremium();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      closeAllModals();
    }
  });

  refreshAuthUI();
})();
