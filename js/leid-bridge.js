/**
 * LEID Bridge — sync account auth between OfficialLEWeb & LEMODZ
 */
(function (global) {
  "use strict";
  var HUB = "https://officialleweb.vercel.app";
  var MODZ = "https://lemodz-official-site.vercel.app";
  var MAX_AGE_MS = 10 * 60 * 1000;
  function b64encode(obj) {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
    catch (e) { return ""; }
  }
  function b64decode(str) {
    try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
    catch (e) {
      try { return JSON.parse(atob(str)); } catch (e2) { return null; }
    }
  }
  function createPayload(user) {
    if (!user || !user.leid) return null;
    return {
      v: 1,
      leid: String(user.leid).trim(),
      password: user.password != null ? String(user.password) : null,
      name: user.name || user.leid,
      facebookId: user.facebookId || null,
      email: user.email || null,
      ts: Date.now(),
      from: "lemodz"
    };
  }
  function readPayloadFromLocation() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw = params.get("leid_bridge") || params.get("bridge");
      if (!raw && window.location.hash) {
        var hp = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        raw = hp.get("leid_bridge") || hp.get("bridge");
      }
      if (!raw && params.get("leid") && params.get("connected") === "1") {
        return {
          v: 1,
          leid: params.get("leid"),
          password: params.get("p") ? b64decode(params.get("p")) : null,
          name: params.get("leid"),
          facebookId: params.get("fb") || null,
          ts: Date.now(),
          from: params.get("from") || "officialleweb"
        };
      }
      if (!raw) return null;
      var data = b64decode(raw);
      if (!data || !data.leid) return null;
      if (data.ts && Date.now() - data.ts > MAX_AGE_MS) return null;
      return data;
    } catch (e) { return null; }
  }
  function openOfficialLEWebWithUser(user) {
    var payload = createPayload(user);
    if (!payload) { window.open(HUB, "_blank", "noopener"); return; }
    var q = "leid_bridge=" + encodeURIComponent(b64encode(payload)) + "&from=lemodz";
    window.location.href = HUB + "/?" + q;
  }
  function openLEMODZWithUser(user) {
    var payload = createPayload(user);
    if (!payload) { window.open(MODZ + "/main.html", "_blank", "noopener"); return; }
    payload.from = "officialleweb";
    var q = "leid_bridge=" + encodeURIComponent(b64encode(payload));
    window.location.href = MODZ + "/main.html?" + q;
  }
  function applyToLemodz(data, getUsers, saveUsers, setSession) {
    if (!data || !data.leid) return null;
    var key = String(data.leid).trim().toLowerCase();
    var users = getUsers();
    var existing = users[key] || {};
    users[key] = {
      leid: String(data.leid).trim(),
      email: data.email || existing.email || (key + "@leid.local"),
      name: data.name || existing.name || String(data.leid).trim(),
      password: data.password != null ? data.password : (existing.password || null),
      isPremium: !!existing.isPremium,
      premiumUntil: existing.premiumUntil || null,
      redeemedCodes: existing.redeemedCodes || [],
      facebookId: data.facebookId || existing.facebookId || null,
      linkedOfficialLEWeb: true,
      createdAt: existing.createdAt || Date.now()
    };
    saveUsers(users);
    var session = {
      leid: users[key].leid,
      email: users[key].email,
      name: users[key].name,
      isPremium: users[key].isPremium,
      premiumUntil: users[key].premiumUntil,
      redeemedCodes: users[key].redeemedCodes,
      facebookId: users[key].facebookId,
      linkedOfficialLEWeb: true,
      via: data.from || "bridge"
    };
    setSession(session);
    return session;
  }
  function cleanUrl() {
    try {
      if (window.history && history.replaceState) {
        history.replaceState({}, "", window.location.pathname);
      }
    } catch (e) {}
  }
  global.LEIDBridge = {
    HUB: HUB,
    MODZ: MODZ,
    createPayload: createPayload,
    readPayloadFromLocation: readPayloadFromLocation,
    openOfficialLEWebWithUser: openOfficialLEWebWithUser,
    openLEMODZWithUser: openLEMODZWithUser,
    applyToLemodz: applyToLemodz,
    cleanUrl: cleanUrl,
    b64encode: b64encode,
    b64decode: b64decode
  };
})(typeof window !== "undefined" ? window : this);
