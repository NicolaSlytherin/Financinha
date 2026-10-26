var SEG = (function () {
  'use strict';
  var ITER = 600000;
  var te = new TextEncoder(), td = new TextDecoder();
  var b64 = function (buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  var deB64 = function (s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  var hex = function (buf) { return Array.from(new Uint8Array(buf)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); };
  var disponivel = function () { return !!(window.crypto && crypto.subtle && crypto.getRandomValues); };
  var sal = function () { return b64(crypto.getRandomValues(new Uint8Array(16))); };

  async function derivar(senha, salB64, iter) {
    var base = await crypto.subtle.importKey('raw', te.encode(senha), 'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deB64(salB64), iterations: iter || ITER }, base, 512);
    var chave = await crypto.subtle.importKey('raw', bits.slice(32, 64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return { verif: hex(bits.slice(0, 32)), chave: chave };
  }
  async function sha256Antigo(senha, salt) {
    return hex(await crypto.subtle.digest('SHA-256', te.encode(salt + ':' + senha)));
  }
  async function cifrar(chave, obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, chave, te.encode(JSON.stringify(obj)));
    return { v: 2, iv: b64(iv), ct: b64(ct) };
  }
  async function decifrar(chave, env) {
    if (!env || typeof env.iv !== 'string' || typeof env.ct !== 'string') throw new Error('formato');
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(env.iv) }, chave, deB64(env.ct));
    return JSON.parse(td.decode(pt));
  }

  var dbp = null, semIdb = false, mem = {};
  function abrir() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, erro) {
      try {
        var r = indexedDB.open('financas-simples', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { var db = r.result; db.onversionchange = function () { db.close(); dbp = null; }; db.onclose = function () { dbp = null; }; ok(db); };
        r.onerror = function () { erro(r.error); };
        r.onblocked = function () { erro(new Error('blocked')); };
      } catch (e) { erro(e); }
    }).catch(function (e) { semIdb = true; throw e; });
    return dbp;
  }
  function tx(modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (ok, erro) {
        var t = db.transaction('kv', modo), st = t.objectStore('kv'), r = fn(st);
        t.oncomplete = function () { ok(r && r.result); };
        t.onerror = function () { erro(t.error); };
        t.onabort = function () { erro(t.error || new Error('abort')); };
      });
    });
  }
  var lsGet = function (k) { try { var v = localStorage.getItem('fs:idb:' + k); return v == null ? (k in mem ? mem[k] : undefined) : JSON.parse(v); } catch (e) { return mem[k]; } };
  var lsSet = function (k, v) { mem[k] = v; try { localStorage.setItem('fs:idb:' + k, JSON.stringify(v)); } catch (e) { if (e && /quota/i.test(e.name + e.message)) throw e; } };
  var lsDel = function (k) { delete mem[k]; try { localStorage.removeItem('fs:idb:' + k); } catch (e) {} };
  var kv = {
    get: function (k) { return tx('readonly', function (s) { return s.get(k); }).catch(function () { return lsGet(k); }); },
    set: function (k, v) {
      return tx('readwrite', function (s) { s.put(v, k); }).catch(function (e) {
        if (v instanceof CryptoKey) { mem[k] = v; return; }
        if (e && /quota/i.test(String(e.name) + String(e.message))) throw e;
        lsSet(k, v);
      });
    },
    del: function (k) { lsDel(k); return tx('readwrite', function (s) { s.delete(k); }).catch(function () {}); },
    usandoReserva: function () { return semIdb; },
  };

  return { ITER: ITER, disponivel: disponivel, sal: sal, derivar: derivar, sha256Antigo: sha256Antigo, cifrar: cifrar, decifrar: decifrar, kv: kv };
})();
