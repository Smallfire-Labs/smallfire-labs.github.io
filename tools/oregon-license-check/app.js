// Oregon CCB bulk license check. Sends the pasted lines to /api/lookup and draws the results. Nothing is saved.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var q = $('q'), out = $('out'), err = $('err'), tbody = $('tbody');
  var LABEL = { expired: 'Expired', due: 'Expires soon', ok: 'OK', none: 'Not found' };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmtDate(iso) {
    if (!iso) return 'No date listed';
    var p = iso.split('-');
    return Number(p[1]) + '/' + Number(p[2]) + '/' + p[0];
  }
  function money(n) { return n == null ? '' : '$' + Number(n).toLocaleString('en-US'); }
  function days(d) {
    if (d.days == null) return '';
    if (d.days < 0) return 'expired ' + (-d.days) + (d.days === -1 ? ' day ago' : ' days ago');
    if (d.days === 0) return 'expires today';
    return d.days + (d.days === 1 ? ' day left' : ' days left');
  }
  function dateCell(label, d, company, amount) {
    var td = el('td');
    td.setAttribute('data-label', label);
    td.appendChild(el('span', 'd ' + d.status, fmtDate(d.date)));
    var extra = [days(d), company, money(amount)].filter(Boolean).join(' · ');
    if (extra) td.appendChild(el('span', 'sub', extra));
    return td;
  }
  function showError(msg) { err.textContent = msg; err.hidden = false; }

  function render(data) {
    tbody.textContent = '';
    var counts = { expired: 0, due: 0, ok: 0, none: 0 };
    // Worst first; the server's paste order is kept within each group.
    var RANK = { expired: 0, due: 1, ok: 2 };
    var rank = function (r) { return r.more ? 4 : r.found ? RANK[r.status] : 3; };
    var rows = data.results.map(function (r, i) { return { r: r, i: i }; });
    rows.sort(function (a, b) { return rank(a.r) - rank(b.r) || a.i - b.i; });
    rows.map(function (x) { return x.r; }).forEach(function (r) {
      var tr = el('tr');
      if (r.more) {
        tr.className = 'none';
        var td = el('td', null, 'More businesses match "' + r.query + '". Showing the first 10; add more of the name to narrow it down.');
        td.colSpan = 5;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      if (!r.found) {
        counts.none++;
        tr.className = 'none';
        tr.appendChild(el('td', 'st', LABEL.none));
        var nt = el('td', null, r.query);
        nt.appendChild(el('span', 'sub', 'Not on the CCB active list today. Check the spelling or number with the CCB.'));
        nt.colSpan = 4;
        nt.className = 'nf';
        tr.appendChild(nt);
        tbody.appendChild(tr);
        return;
      }
      counts[r.status]++;
      tr.className = r.status;
      tr.appendChild(el('td', 'st', LABEL[r.status]));
      var name = el('td', null, r.name);
      name.appendChild(el('span', 'sub', '#' + r.license_number + (r.city ? ' · ' + r.city : '') + (r.endorsements.length ? ' · ' + r.endorsements.join(', ') : '')));
      tr.appendChild(name);
      tr.appendChild(dateCell('License', r.license));
      tr.appendChild(dateCell('Bond', r.bond, r.bond.company, r.bond.amount));
      tr.appendChild(dateCell('Liability insurance', r.insurance, r.insurance.company, r.insurance.amount));
      tbody.appendChild(tr);
    });
    var c = $('counts');
    c.textContent = '';
    [['expired', 'Expired'], ['due', 'Expires soon'], ['ok', 'OK'], ['none', 'Not found']].forEach(function (k) {
      c.appendChild(el('span', 'c-' + k[0], counts[k[0]] + ' ' + k[1]));
    });
    var asof = 'Checked against the CCB Active Licenses data';
    if (data.data_updated) asof += ', last updated by the state on ' + new Date(data.data_updated).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    $('asof').textContent = asof + '. Days are counted from today (' + fmtDate(data.today) + ', Oregon time).';
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
      .then(function () { btn.disabled = false; btn.textContent = 'Check licenses'; });
  });
  $('example').addEventListener('click', function () { q.value = '213645\nReliable Construction Services'; q.focus(); });
  $('clear').addEventListener('click', function () { q.value = ''; out.hidden = true; err.hidden = true; q.focus(); });
})();
