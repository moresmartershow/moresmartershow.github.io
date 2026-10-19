// The More Smarter Show site: shared behavior for every page.
(function () {
  var EPS = window.EPISODES || [];
  var $ = function (id) { return document.getElementById(id); };
  var PLAY = '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>';
  var fmtDate = function (d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  var thumb = function (id, hi) { return 'https://i.ytimg.com/vi/' + id + '/' + (hi ? 'maxresdefault' : 'hqdefault') + '.jpg'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var isGuest = function (e) { return /\(with /i.test(e.t); };

  // old single-page links like /#ep-69 now live on the Episodes page
  var page = document.body.getAttribute('data-page');
  if (page === 'home' && /^#ep-\d+$/.test(location.hash)) { location.replace('episodes.html' + location.hash); return; }

  // highlight the current page in the menu
  document.querySelectorAll('.nav a[data-page]').forEach(function (a) {
    if (a.getAttribute('data-page') === page) a.setAttribute('aria-current', 'page');
  });
  if ($('yr')) $('yr').textContent = new Date().getFullYear();

  // click-to-play: only load YouTube when someone presses play
  function mountPlayer(el, ep, hi, autoplay) {
    if (autoplay) {
      el.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + ep.id + '?autoplay=1&rel=0" title="' + esc(ep.t) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      return;
    }
    el.innerHTML = '<img src="' + thumb(ep.id, hi) + '" alt="' + esc(ep.t) + ' thumbnail" loading="lazy" onerror="this.src=\'' + thumb(ep.id, false) + '\'">' +
      '<button class="play" aria-label="Play episode ' + ep.n + ': ' + esc(ep.t) + '">' + PLAY + '</button>';
    el.querySelector('button').addEventListener('click', function () { mountPlayer(el, ep, hi, true); });
  }
  function card(e) {
    return '<button class="card" id="ep-' + e.n + '" data-n="' + e.n + '">' +
      '<div class="thumb"><img src="' + thumb(e.id) + '" alt="" loading="lazy"><span class="dur">' + e.l + '</span></div>' +
      '<h3>' + esc(e.t) + '</h3><div class="meta">Episode ' + e.n + ' · ' + fmtDate(e.d) + '</div><p>' + esc(e.s) + '</p></button>';
  }

  // latest episode (home)
  if ($('latest-player') && EPS[0]) {
    var latest = EPS[0];
    mountPlayer($('latest-player'), latest, true, false);
    $('latest-num').textContent = 'Episode ' + latest.n;
    $('latest-title').textContent = latest.t;
    $('latest-meta').textContent = fmtDate(latest.d) + ' · ' + latest.l;
  }

  // episode player dialog
  var dlg = $('dlg');
  function openEp(n) {
    var e = EPS.find(function (x) { return x.n === n; }); if (!e || !dlg) return;
    $('dlg-title').textContent = 'Episode ' + e.n + ': ' + e.t;
    $('dlg-desc').textContent = e.s;
    $('dlg-yt').href = 'https://www.youtube.com/watch?v=' + e.id;
    mountPlayer($('dlg-player'), e, true, true);
    if (!dlg.open) dlg.showModal();
    if (page === 'episodes') history.replaceState(null, '', '#ep-' + e.n);
  }
  function closeEp() { $('dlg-player').innerHTML = ''; if (dlg.open) dlg.close(); if (page === 'episodes') history.replaceState(null, '', location.pathname); }
  if (dlg) {
    $('dlg-close').addEventListener('click', closeEp);
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) closeEp(); });
    dlg.addEventListener('cancel', function (ev) { ev.preventDefault(); closeEp(); });
    document.addEventListener('click', function (ev) {
      var c = ev.target.closest('.card'); if (c) openEp(+c.dataset.n);
    });
  }

  // recent episodes (home)
  if ($('recent-grid')) $('recent-grid').innerHTML = EPS.slice(0, 6).map(card).join('');

  // full library with search + filters (episodes page)
  var grid = $('grid');
  if (grid) {
    var q = $('q'), count = $('count'), empty = $('empty'), filter = 'all';
    var render = function () {
      var term = q.value.trim().toLowerCase();
      var list = EPS.filter(function (e) {
        if (filter === 'guest' && !isGuest(e)) return false;
        if (filter === 'duo' && isGuest(e)) return false;
        return !term || (e.t + ' ' + e.s + ' episode ' + e.n).toLowerCase().indexOf(term) !== -1;
      });
      grid.innerHTML = list.map(card).join('');
      count.textContent = list.length === EPS.length ? EPS.length + ' episodes' : list.length + ' of ' + EPS.length + ' episodes';
      empty.hidden = list.length > 0;
    };
    q.addEventListener('input', render);
    document.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        filter = c.dataset.f;
        document.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        render();
      });
    });
    render();
    var m = location.hash.match(/^#ep-(\d+)$/); if (m) openEp(+m[1]);

    // structured data for search engines
    var ld = {
      '@context': 'https://schema.org', '@type': 'PodcastSeries', name: 'The More Smarter Show',
      description: 'A podcast for self-employed people and business owners about working smarter, not harder.',
      url: location.origin + '/', webFeed: 'https://open.spotify.com/show/1ER3J5veUX59H5ya2H1MA5',
      author: [{ '@type': 'Person', name: 'Dylan Onorevole' }, { '@type': 'Person', name: 'Jake Handler' }],
      hasPart: EPS.map(function (e) {
        return { '@type': 'PodcastEpisode', episodeNumber: e.n, name: e.t, datePublished: e.d, description: e.s,
          url: location.origin + '/episodes.html#ep-' + e.n, thumbnailUrl: thumb(e.id, false) };
      })
    };
    var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
  }

  // guest recording dates come live from the Google Form (kept rolling by the show's Apps Script)
  var slots = $('slots');
  if (slots) {
    var CANT = 'I want to be on the show but I absolutely cannot make any of these times work!';
    var draw = function (list) {
      slots.innerHTML = list.map(function (l) {
        return '<label class="opt"><input type="checkbox" name="' + slots.dataset.name + '" value="' + esc(l) + '"> ' + esc(l) + '</label>';
      }).join('');
    };
    fetch(slots.dataset.src).then(function (r) { return r.json(); })
      .then(function (j) { draw(j.slots && j.slots.length ? j.slots : [CANT]); })
      .catch(function () { draw([CANT]); });
  }

  // guest application: our own form, answers still land in the Google Form
  var form = $('apply');
  if (form) {
    var sent = false;
    // "Other" text box checks its option when typed in
    form.querySelectorAll('.other-text').forEach(function (t) {
      t.addEventListener('input', function () { var box = t.closest('.opt').querySelector('input[type=checkbox],input[type=radio]'); if (t.value) box.checked = true; });
    });
    form.addEventListener('submit', function (ev) {
      var bad = null;
      form.querySelectorAll('.q').forEach(function (q) {
        var ok = true;
        if (q.getAttribute('data-required') === 'false') { q.classList.remove('invalid'); return; }
        var text = q.querySelector('input[type=text],input[type=email],textarea');
        var choices = q.querySelectorAll('input[type=checkbox],input[type=radio]');
        if (choices.length || q.tagName === 'FIELDSET') {
          var picked = [].filter.call(choices, function (c) { return c.checked; });
          ok = picked.length > 0 && picked.every(function (c) {
            return c.value !== '__other_option__' || c.closest('.opt').querySelector('.other-text').value.trim();
          });
        } else if (text) {
          ok = text.value.trim() !== '' && (text.type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text.value.trim()));
        }
        q.classList.toggle('invalid', !ok);
        if (!ok && !bad) bad = q;
      });
      if (bad) { ev.preventDefault(); bad.scrollIntoView({ behavior: 'smooth', block: 'center' }); var f = bad.querySelector('input,textarea'); if (f) f.focus({ preventScroll: true }); return; }
      // "Other" text boxes only send when their option is checked
      form.querySelectorAll('.other-text').forEach(function (t) {
        var box = t.closest('.opt').querySelector('input[type=checkbox],input[type=radio]');
        t.disabled = !box.checked;
      });
      $('apply-btn').disabled = true; $('apply-btn').textContent = 'Sending…';
      sent = true;
    });
    $('apply-target').addEventListener('load', function () {
      if (!sent) return;
      form.hidden = true; $('thanks').hidden = false;
      $('thanks').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
})();
