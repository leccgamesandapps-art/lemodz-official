(function () {
  "use strict";
  const USERS_KEY = "lemodz_users";
  const SESSION_KEY = "lemodz_session";
  function getUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch (e) { return {}; } }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; } }
  function setSession(u) { if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u)); else localStorage.removeItem(SESSION_KEY); }
  var currentUser = getSession();
  function toast(msg, type) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 16px;border-radius:10px;z-index:9999;background:#1a1a22;color:#fff;border:1px solid #333"; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = "block";
    setTimeout(function () { t.style.display = "none"; }, 2800);
  }
  function acceptLeidFromHub(leid, via, extra) {
    if (!leid) return;
    var users = getUsers();
    var key = String(leid).trim().toLowerCase();
    if (!users[key]) {
      users[key] = { leid: String(leid).trim(), email: key + "@leid.local", name: (extra && extra.name) || String(leid).trim(), password: null, isPremium: false, premiumUntil: null, redeemedCodes: [], facebookId: (extra && extra.facebookId) || null, linkedOfficialLEWeb: true, createdAt: Date.now() };
    } else {
      users[key].linkedOfficialLEWeb = true;
      if (extra && extra.facebookId) users[key].facebookId = extra.facebookId;
      if (extra && extra.name) users[key].name = extra.name;
    }
    saveUsers(users);
    var u = users[key];
    currentUser = { leid: u.leid, email: u.email, name: u.name || u.leid, isPremium: !!u.isPremium, premiumUntil: u.premiumUntil || null, redeemedCodes: u.redeemedCodes || [], facebookId: u.facebookId || null, linkedOfficialLEWeb: true, via: via || "officialleweb" };
    setSession(currentUser);
    if (typeof refreshAuthUI === "function") refreshAuthUI();
    toast("LEID " + currentUser.leid + " linked to LEMODZ", "success");
  }
  function realFacebookLogin() {
    function run() {
      if (typeof FB === "undefined") { toast("Facebook SDK loading… try again"); return; }
      FB.login(function (response) {
        if (!response.authResponse) { toast("Facebook login cancelled"); return; }
        FB.api("/me", { fields: "id,name,email" }, function (profile) {
          if (!profile || profile.error) { toast("Could not read Facebook profile"); return; }
          var leid = (profile.name || "").trim().replace(/\s+/g, "_");
          if (!leid) leid = "fb_" + profile.id;
          var users = getUsers();
          var key = leid.toLowerCase();
          for (var k in users) { if (users[k].facebookId === profile.id) { leid = users[k].leid; key = k; break; } }
          if (!users[key]) {
            users[key] = { leid: leid, email: profile.email || key + "@leid.local", name: profile.name || leid, password: null, isPremium: false, premiumUntil: null, redeemedCodes: [], facebookId: profile.id, linkedOfficialLEWeb: true, createdAt: Date.now() };
          } else {
            users[key].facebookId = profile.id;
            users[key].name = profile.name || users[key].name;
            users[key].linkedOfficialLEWeb = true;
          }
          saveUsers(users);
          currentUser = { leid: users[key].leid, email: users[key].email, name: users[key].name, isPremium: !!users[key].isPremium, premiumUntil: users[key].premiumUntil || null, redeemedCodes: users[key].redeemedCodes || [], facebookId: profile.id, linkedOfficialLEWeb: true, via: "facebook" };
          setSession(currentUser);
          toast("Signed in with Facebook as LEID " + currentUser.leid);
          if (typeof closeAuthModal === "function") closeAuthModal();
          if (typeof refreshAuthUI === "function") refreshAuthUI();
          else location.reload();
        });
      }, { scope: "public_profile,email" });
    }
    if (window.fbReady && typeof FB !== "undefined") run();
    else {
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (window.fbReady && typeof FB !== "undefined") { clearInterval(t); run(); }
        else if (tries > 40) { clearInterval(t); toast("Facebook SDK failed to load"); }
      }, 250);
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var btnContinueLeid = document.getElementById("btn-continue-leid");
    if (btnContinueLeid) {
      btnContinueLeid.addEventListener("click", function () {
        var returnUrl = encodeURIComponent(location.origin + "/main.html");
        window.location.href = "https://officialleweb.vercel.app/?return_to=" + returnUrl + "&app=lemodz";
      });
    }
    var btnFbLogin = document.getElementById("btn-fb-login");
    if (btnFbLogin) btnFbLogin.addEventListener("click", realFacebookLogin);
    var btnFbReg = document.getElementById("btn-fb-register");
    if (btnFbReg) btnFbReg.addEventListener("click", realFacebookLogin);
    try {
      var params = new URLSearchParams(window.location.search);
      var hubLeid = params.get("leid");
      if (hubLeid) {
        acceptLeidFromHub(hubLeid, "officialleweb", { name: params.get("name") || hubLeid, facebookId: params.get("fb") || params.get("facebookId") || null });
        if (window.history && history.replaceState) {
          var u = new URL(location.href);
          ["leid","name","fb","facebookId","from","connected","return_to","app"].forEach(function (k) { u.searchParams.delete(k); });
          history.replaceState({}, "", u.pathname + (u.search || ""));
        }
      }
    } catch (err) {}
  });
  window.LEMODZAuth = { getSession: getSession, setSession: setSession, realFacebookLogin: realFacebookLogin, acceptLeidFromHub: acceptLeidFromHub, getUsers: getUsers };
})();
