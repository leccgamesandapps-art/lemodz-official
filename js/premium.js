/**
 * LEMODZ Premium — buy, redeem, countdown, stack time
 */
(function (global) {
  "use strict";

  var USERS_KEY = "lemodz_users";
  var SESSION_KEY = "lemodz_session";

  // Secret promo codes → days (not shown in UI)
  // Each code is one use per user account
  var PROMO_CODES = {
    FreePremium2026: 30,
    FreePremiun2026: 30
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

  function isPremium(user) {
    if (!user) return false;
    if (!user.isPremium) return false;
    if (!user.premiumUntil) return false;
    return Date.now() < user.premiumUntil;
  }

  function remainingMs(user) {
    if (!user || !user.isPremium || !user.premiumUntil) return 0;
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

  /** Stack: add days onto current remaining time (or from now if expired) */
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
      if (user.redeemedCodes) {
        users[user.email].redeemedCodes = user.redeemedCodes;
      }
      saveUsers(users);
    }
    notifyChange();
    return user;
  }

  function normalizeCode(raw) {
    return String(raw || "").trim();
  }

  function resolvePromoDays(raw) {
    var code = normalizeCode(raw);
    if (!code) return null;
    if (PROMO_CODES[code] != null) return { key: code, days: PROMO_CODES[code] };
    var key = Object.keys(PROMO_CODES).find(function (k) {
      return k.toLowerCase() === code.toLowerCase();
    });
    if (key) return { key: key, days: PROMO_CODES[key] };
    return null;
  }

  function redeemCode(user, rawCode) {
    if (!user) return { ok: false, error: "signin" };
    var resolved = resolvePromoDays(rawCode);
    if (!resolved) {
      var empty = !normalizeCode(rawCode);
      return { ok: false, error: empty ? "empty" : "invalid" };
    }

    var redeemed = user.redeemedCodes || [];
    var users = getUsers();
    var stored = users[user.email] || {};
    var storedRedeemed = stored.redeemedCodes || redeemed;
    if (storedRedeemed.indexOf(resolved.key) !== -1) {
      return { ok: false, error: "used" };
    }

    user.redeemedCodes = storedRedeemed.concat([resolved.key]);
    activatePremiumDays(user, resolved.days);
    return { ok: true, days: resolved.days, user: getSession() };
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

    function updateUI(user) {
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

      // Do NOT lock buy / redeem — stacking is allowed
      if (plansWrap) {
        plansWrap.classList.remove("is-locked");
        plansWrap.querySelectorAll(".plan-card").forEach(function (card) {
          card.disabled = false;
          card.setAttribute("aria-disabled", "false");
        });
      }
      if (redeemWrap) {
        redeemWrap.classList.remove("is-locked");
        if (codeInput) codeInput.disabled = false;
        if (btnRedeem) btnRedeem.disabled = false;
      }
      if (lockNote) {
        if (active && ms > 0) {
          lockNote.hidden = false;
          lockNote.textContent =
            "Premium active. Buy or redeem again to add more time.";
        } else {
          lockNote.hidden = true;
          lockNote.textContent = "";
        }
      }

      if (user && user.isPremium && ms <= 0) {
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
      updateUI(getSession());
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
          if (!user) {
            setMsg("Please Sign In or Sign Up first.", true);
            if (typeof opts.onNeedAuth === "function") opts.onNeedAuth();
            return;
          }
          var plan = card.dataset.plan;
          if (openWhopCheckout(plan)) {
            setMsg(
              "Finish payment on Whop to add Premium time. Closing checkout does not activate Premium."
            );
            if (typeof opts.onToast === "function") {
              opts.onToast("Complete payment on Whop to add Premium time", "success");
            }
            return;
          }
          setMsg("Checkout unavailable for this plan. Try again later.", true);
          if (typeof opts.onToast === "function") {
            opts.onToast("Checkout unavailable", "error");
          }
        });
      });
    }

    function doRedeem() {
      var user = getSession();
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
        else if (result.error === "used")
          setMsg("You already used this code on this account.", true);
        else setMsg("Could not redeem.", true);
        if (typeof opts.onToast === "function") {
          var t =
            result.error === "used"
              ? "Code already used"
              : result.error === "invalid"
              ? "Invalid code"
              : "Redeem failed";
          opts.onToast(t, "error");
        }
        return;
      }
      if (codeInput) codeInput.value = "";
      setMsg("Code redeemed — +" + result.days + " days Premium stacked!");
      if (typeof opts.onToast === "function") {
        opts.onToast("+" + result.days + " days Premium added!", "success");
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

    return { tick: tick, updateUI: updateUI };
  }

  global.LEPremium = {
    getSession: getSession,
    setSession: setSession,
    getUsers: getUsers,
    saveUsers: saveUsers,
    isPremium: isPremium,
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
