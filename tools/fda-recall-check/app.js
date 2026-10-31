// FDA food recall check. Sends the pasted names to /api/lookup and draws the matches. Nothing is saved.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var q = $('q'), out = $('out'), err = $('err'), groups = $('groups');
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmtDate(iso) {
    if (!iso) return 'no date listed';
    var p = iso.split('-');
    return Number(p[1]) + '/' + Number(p[2]) + '/' + p[0];
  }
  function showError(msg) { err.textContent = msg; err.hidden = false; }
  function render(data) {
    groups.textContent = '';
    data.results.forEach(function (r) {
      var g = el('div', 'grp');
      g.appendChild(el('h3', null, r.query));
      if (!r.hits.length) {
        g.appendChild(el('p', 'none', 'No FDA food recalls found for a firm name containing: ' + r.words.join(', ') + '.'));
      } else {
        g.appendChild(el('p', 'sf-small sf-muted', r.total + (r.total === 1 ? ' recall matches' : ' recalls match') + ' a firm name containing: ' + r.words.join(', ') + (r.total > r.hits.length ? '. Showing the ' + r.hits.length + ' most recent.' : '.')));
        r.hits.forEach(function (h) {
          var cls = /III$/.test(h.classification) ? 'c3' : /II$/.test(h.classification) ? 'c2' : 'c1';
          var d = el('div', 'hit ' + (h.classification ? cls : ''));
          var top = el('p');
          if (h.classification) top.appendChild(el('span', 'badge ' + cls, h.classification + (cls === 'c1' ? ' (most serious)' : cls === 'c3' ? ' (least serious)' : '')));
          top.appendChild(el('strong', null, h.firm));
          top.appendChild(document.createTextNode(' · ' + [h.city, h.state].filter(Boolean).join(', ')));
          d.appendChild(top);
          d.appendChild(el('p', null, 'Product: ' + h.product));
          d.appendChild(el('p', null, 'Reason: ' + h.reason));
          var m = el('p', 'meta', 'Started ' + fmtDate(h.initiated) + ' · Status: ' + (h.status || 'not listed') + ' · ' + h.recall_number + ' · ');
          if (h.link) { var a = el('a', null, 'FDA record (openFDA)'); a.href = h.link; a.rel = 'noopener'; m.appendChild(a); }
          d.appendChild(m);
          g.appendChild(d);
        });
      }
      groups.appendChild(g);
    });
    $('asof').textContent = 'Searched FDA food enforcement reports' + (data.data_updated ? ', data last updated by openFDA on ' + fmtDate(data.data_updated) : '') + '.';
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('check').addEventListener('click', function () {
    err.hidden = true;
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Checking…';
    fetch((document.documentElement.getAttribute('data-api') || '') + '/api/lookup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: q.value }) })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) { if (r.ok) render(r.body); else { out.hidden = true; showError(r.body.error || 'Something went wrong.'); } })
      .catch(function () { showError('Could not reach the checker. Check your connection and try again.'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Check recalls'; });
  });
  $('clear').addEventListener('click', function () { q.value = ''; out.hidden = true; err.hidden = true; q.focus(); });
})();
