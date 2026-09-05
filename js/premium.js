/**
 * LEMODZ Premium — buy, redeem, countdown, lock state
 * Shared module used by app.js
 */
(function (global) {
  "use strict";

  var USERS_KEY = "lemodz_users";
  var SESSION_KEY = "lemodz_session";
  var OWNER_PREMIUM = ["lanceefi2011", "lanceefi2026", "leccgamesandapps"];

  // Secret promo codes → days (never display these in UI)
  var PROMO_CODES = {
    FreePremiun2026: 30,
    FreePremium2026: 30
  };

  var WHOP_CHECKOUT = {
    day: "https://whop.com/checkout/ch_yNDF6JY0TS1O2jl/",
    week: "https://whop.com/checkout/ch_F2KB7UiJcMZEiSi/",
    month: "https://whop.com/checkout/ch_75gZ3WLHi3LAIyo/",
    year: "https://whop.com/checkout/ch_iSnaOuFuChX3Jw5/"
  };

  var countdownTimer = null;
  var onChangeCallbacks = [];

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveUsers(u) {
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function setSession(u) {
    if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_KEY);
  }

  function isOwnerPremiumEligible(user) {
    if (!user || !user.email) return false;
    var e = String(user.email).toLowerCase();
    var name = String(user.name || "").toLowerCase();
    return OWNER_PREMIUM.some(function (k) {
      return e.indexOf(k) !== -1 || name.indexOf(k) !== -1;
    });
  }

  function isPremium(user) {
    if (!user) return false;
    if (isOwnerPremiumEligible(user)) return true;
    if (!user.isPremium) return false;
    if (!user.premiumUntil) return true;
    return Date.now() < user.premiumUntil;
  }

  function remainingMs(user) {
    if (!user) return 0;
    if (isOwnerPremiumEligible(user)) {
      if (user.premiumUntil && user.premiumUntil > Date.now()) {
        return user.premiumUntil - Date.now();
      }
      return 365 * 24 * 60 * 60 * 1000;
    }
    if (!user.isPremium || !user.premiumUntil) return 0;
    return Math.max(0, user.premiumUntil - Date.now());
  }

  function formatCountdown(ms) {
    if (ms <= 0) return "0d 0h 0m 0s";
    var totalSec = Math.floor(ms / 1000);
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;
    return days + "d " + hours + "h " + mins + "m " + secs + "s";
  }

  function activatePremiumDays(user, days) {
    if (!user) return null;
    var add = days * 24 * 60 * 60 * 1000;
    var base = Date.now();
    if (user.premiumUntil && user.premiumUntil > Date.now()) {
      base = user.premiumUntil;
    }
    var until = base + add;
    user.isPremium = true;
    user.premiumUntil = until;
    setSession(user);
    var users = getUsers();
    if (users[user.email]) {
      users[user.email].isPremium = true;
      users[user.email].premiumUntil = until;
      saveUsers(users);
    }
    notifyChange();
    return user;
  }

  function redeemCode(user, rawCode) {
    if (!user) return { ok: false, error: "signin" };
    var raw = String(rawCode || "").trim();
    if (!raw) return { ok: false, error: "empty" };

    var days = PROMO_CODES[raw];
    if (!days) {
      var key = Object.keys(PROMO_CODES).find(function (k) {
        return k.toLowerCase() === raw.toLowerCase();
      });
      days = key ? PROMO_CODES[key] : null;
    }
    if (!days) return { ok: false, error: "invalid" };

    activatePremiumDays(user, days);
    return { ok: true, days: days, user: getSession() };
  }

  function openWhopCheckout(plan) {
    var url = WHOP_CHECKOUT[plan];
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    }
    return false;
  }

  function notifyChange() {
    onChangeCallbacks.forEach(function (fn) {
      try {
        fn(getSession());
      } catch (e) {}
    });
  }

  function onPremiumChange(fn) {
    if (typeof fn === "function") onChangeCallbacks.push(fn);
  }

  function bindUI(opts) {
    opts = opts || {};
    var countdownEl = opts.countdownEl || document.getElementById("premium-countdown");
    var plansWrap = opts.plansWrap || document.querySelector(".premium-plans");
    var redeemWrap = opts.redeemWrap || document.querySelector(".code-redeem");
    var codeInput = opts.codeInput || document.getElementById("premium-code");
    var btnRedeem = opts.btnRedeem || document.getElementById("btn-redeem-code");
    var msgEl = opts.msgEl || document.getElementById("premium-msg");
    var lockNote = opts.lockNote || document.getElementById("premium-lock-note");

    function setMsg(text, isError) {
      if (!msgEl) return;
      msgEl.textContent = text || "";
      if (isError) msgEl.classList.add("error");
      else msgEl.classList.remove("error");
    }

    function updateLockState(user) {
      var active = isPremium(user);
      var ms = remainingMs(user);

      if (countdownEl) {
        if (active && ms > 0) {
          countdownEl.hidden = false;
          countdownEl.innerHTML =
            '<span class="cd-label">Premium</span> <span class="cd-time">' +
            formatCountdown(ms) +
            "</span>";
        } else {
          countdownEl.hidden = true;
          countdownEl.innerHTML = "";
        }
      }

      if (plansWrap) {
        plansWrap.classList.toggle("is-locked", active);
        plansWrap.querySelectorAll(".plan-card").forEach(function (card) {
          card.disabled = active;
          card.setAttribute("aria-disabled", active ? "true" : "false");
        });
      }
      if (redeemWrap) {
        redeemWrap.classList.toggle("is-locked", active);
        if (codeInput) codeInput.disabled = active;
        if (btnRedeem) btnRedeem.disabled = active;
      }
      if (lockNote) {
        lockNote.hidden = !active;
        if (active) {
          lockNote.textContent =
            "Premium active — buy & redeem locked until timer reaches 0.";
        }
      }

      if (user && user.isPremium && ms <= 0 && !isOwnerPremiumEligible(user)) {
        user.isPremium = false;
        user.premiumUntil = null;
        setSession(user);
        var users = getUsers();
        if (users[user.email]) {
          users[user.email].isPremium = false;
          users[user.email].premiumUntil = null;
          saveUsers(users);
        }
        notifyChange();
      }
    }

    function tick() {
      var user = getSession();
      updateLockState(user);
    }

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 1000);
    tick();

    onPremiumChange(function () {
      tick();
    });

    if (plansWrap) {
      plansWrap.querySelectorAll(".plan-card").forEach(function (card) {
        card.addEventListener("click", function () {
          var user = getSession();
          if (isPremium(user)) {
            setMsg("You already have Premium. Wait until the timer ends.", true);
            return;
          }
          if (!user) {
            setMsg("Please Sign In or Sign Up first.", true);
            if (typeof opts.onNeedAuth === "function") opts.onNeedAuth();
            return;
          }
          var plan = card.dataset.plan;
          var days = parseInt(card.dataset.days || "0", 10);
          if (openWhopCheckout(plan)) {
            setMsg("Complete payment on Whop, then return here.");
            if (typeof opts.onToast === "function") {
              opts.onToast("Opening Whop checkout…", "success");
            }
            return;
          }
          activatePremiumDays(user, days);
          setMsg("Premium activated.");
          if (typeof opts.onToast === "function") {
            opts.onToast("Premium activated!", "success");
          }
          tick();
        });
      });
    }

    function doRedeem() {
      var user = getSession();
      if (isPremium(user)) {
        setMsg("You already have Premium. Wait until the timer ends.", true);
        return;
      }
      if (!user) {
        setMsg("Sign in first to redeem a code.", true);
        if (typeof opts.onNeedAuth === "function") opts.onNeedAuth();
        return;
      }
      var raw = codeInput ? codeInput.value : "";
      var result = redeemCode(user, raw);
      if (!result.ok) {
        if (result.error === "empty") setMsg("Enter a code first.", true);
        else if (result.error === "invalid") setMsg("Invalid code.", true);
        else setMsg("Could not redeem.", true);
        if (typeof opts.onToast === "function") {
          opts.onToast(result.error === "invalid" ? "Invalid code" : "Redeem failed", "error");
        }
        return;
      }
      if (codeInput) codeInput.value = "";
      setMsg("Code redeemed — " + result.days + " days Premium unlocked!");
      if (typeof opts.onToast === "function") {
        opts.onToast("Premium unlocked for " + result.days + " days!", "success");
      }
      tick();
      if (typeof opts.onRedeemed === "function") opts.onRedeemed(result);
    }

    if (btnRedeem) btnRedeem.addEventListener("click", doRedeem);
    if (codeInput) {
      codeInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          doRedeem();
        }
      });
    }

    return { tick: tick, updateLockState: updateLockState };
  }

  global.LEPremium = {
    getSession: getSession,
    setSession: setSession,
    getUsers: getUsers,
    saveUsers: saveUsers,
    isPremium: isPremium,
    isOwnerPremiumEligible: isOwnerPremiumEligible,
    remainingMs: remainingMs,
    formatCountdown: formatCountdown,
    activatePremiumDays: activatePremiumDays,
    redeemCode: redeemCode,
    openWhopCheckout: openWhopCheckout,
    onPremiumChange: onPremiumChange,
    bindUI: bindUI,
    WHOP_CHECKOUT: WHOP_CHECKOUT
  };
})(typeof window !== "undefined" ? window : this);
