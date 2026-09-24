/**
 * AliAds — Telegram orqali kirish (sayt tomoni)
 * Bot tokeni bu yerda YO'Q va hech qachon bo'lmaydi — u faqat serverda (Cloudflare Worker).
 */
(function () {
  var CONFIG = {
    api: 'https://aliads-auth.doctorali.workers.dev',
    botId: '8963142523',   // @BotFather bergan tokenning : belgisigacha bo'lgan RAQAMI (ochiq ma'lumot)
    botUser: 'AliAdsUzBot' // bot username, masalan AliAdsUzBot
  };

  var tugma = document.querySelector('.telegram');
  var holatQator = document.querySelector('#status');
  if (!tugma) return;

  function holat(matn, rang) {
    if (!holatQator) return;
    holatQator.textContent = matn;
    holatQator.style.color = rang || '#ffd97a';
  }

  /* Sessiya: api boshqa domenda bo'lsa cookie ishlamaydi — tokenni o'zimiz saqlaymiz */
  function tokenOl() { try { return localStorage.getItem('aliads_s') || ''; } catch (e) { return ''; } }
  function tokenSaqla(t) { try { t ? localStorage.setItem('aliads_s', t) : localStorage.removeItem('aliads_s'); } catch (e) {} }

  function so(yol, opt) {
    opt = opt || {};
    var h = Object.assign({}, opt.headers || {});
    var t = tokenOl();
    if (t) h.Authorization = 'Bearer ' + t;
    return fetch(CONFIG.api + yol, Object.assign({ credentials: 'include' }, opt, { headers: h }))
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }

  /* --- kirgan holatni ko'rsatish --- */
  function kirganKorinish(u) {
    var karta = document.querySelector('.login-card');
    if (!karta) return;
    // kartaning nur ramkasi (.card-beam) saqlanib qolsin — faqat ichki qismini almashtiramiz
    [].forEach.call(karta.children, function (el) {
      if (!el.classList.contains('card-beam') && !el.classList.contains('card-spot')) el.style.display = 'none';
    });
    var blok = document.createElement('div');
    blok.className = 'kirgan-blok';
    var rasm = u.rasm
      ? '<img src="' + u.rasm + '" alt="" width="64" height="64">'
      : '<span class="bosh">' + (u.ism || '?').trim().charAt(0).toUpperCase() + '</span>';
    blok.innerHTML =
      '<div class="kirgan-avatar">' + rasm + '</div>' +
      '<h1>Xush kelibsiz,<br>' + (u.ism || '') + '</h1>' +
      '<p class="kirgan-rol">' + (u.rol === 'admin' ? 'Administrator' : 'Kuzatuvchi') +
        (u.login ? ' · ' + u.login : '') + '</p>' +
      '<a class="submit" href="yonalishlar.html">Davom etish →</a>' +
      '<button type="button" class="telegram" id="chiqish">Chiqish</button>';
    karta.appendChild(blok);
    document.querySelector('#chiqish').onclick = function () {
      so('/auth/logout', { method: 'POST' }).then(function () { tokenSaqla(''); location.reload(); });
    };
  }

  /* --- Telegram javobini serverga yuborish --- */
  function yubor(user) {
    holat('Tekshirilmoqda…');
    so('/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    }).then(function (r) {
      var j = r.j || {};
      if (j.holat === 'kirdi') { if (j.token) tokenSaqla(j.token); kirganKorinish(j); return; }
      if (j.holat === 'kutilmoqda') {
        holat("So'rovingiz yuborildi. Administrator tasdiqlagach kira olasiz.", '#ffd97a');
        return;
      }
      if (j.holat === 'bekor') { holat('Kirish rad etilgan.', '#ff9b9b'); return; }
      holat(j.xato || 'Kirishda xatolik.', '#ff9b9b');
    }).catch(function () {
      holat('Serverga ulanib bo\'lmadi. Keyinroq urinib ko\'ring.', '#ff9b9b');
    });
  }

  /* --- tugma bosilganda --- */
  tugma.addEventListener('click', function (e) {
    if (!CONFIG.botId) return;           // hali sozlanmagan — eski modal ochilaveradi
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!window.Telegram || !window.Telegram.Login) {
      holat('Telegram oynasi yuklanmadi. Internetni tekshiring.', '#ff9b9b');
      return;
    }
    window.Telegram.Login.auth(
      { bot_id: CONFIG.botId, request_access: true },
      function (user) { if (user) yubor(user); }
    );
  }, true);

  /* --- sahifa ochilganda: allaqachon kirganmi? --- */
  if (CONFIG.botId) {
    var s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    document.head.appendChild(s);

    so('/auth/me').then(function (r) {
      if (r.j && r.j.kirgan) kirganKorinish(r.j);
    }).catch(function () { /* server yotgan bo'lsa sayt oddiy ishlayveradi */ });
  }
})();
