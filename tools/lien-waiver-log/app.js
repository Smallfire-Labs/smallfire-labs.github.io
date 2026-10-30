(function () {
  'use strict';
  var KEY = 'sfl-lien-waiver-log-v1';
  var TYPES = {
    cp: 'Conditional, progress',
    up: 'Unconditional, progress',
    cf: 'Conditional, final',
    uf: 'Unconditional, final'
  };
  var $ = function (id) { return document.getElementById(id); };
  var rows = load();

  function load() {
    try {
      var r = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(r) ? r.filter(valid) : [];
    } catch (e) { return []; }
  }
  function valid(r) {
    return r && typeof r.sub === 'string' && TYPES[r.type] && (r.status === 'received' || r.status === 'missing');
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(rows)); $('saveerr').hidden = true; }
    catch (e) { $('saveerr').hidden = false; }
  }
  function clean(s, n) { return String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')); }
  function money(v) {
    if (v === '' || v === null || isNaN(v)) return '';
    return Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function render() {
    var tb = $('tbody');
    tb.textContent = '';
    var got = 0, miss = 0;
    var sorted = rows.slice().sort(function (a, b) {
      return a.sub.localeCompare(b.sub) || String(a.pay).localeCompare(String(b.pay));
    });
    sorted.forEach(function (r) {
      if (r.status === 'received') got++; else miss++;
      var tr = document.createElement('tr');
      tr.className = r.status === 'received' ? 'ok' : 'missing';
      [r.sub, r.pay, money(r.amount), TYPES[r.type]].forEach(function (v) {
        var td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
      });
      var st = document.createElement('td');
      st.className = 'st';
      st.textContent = r.status === 'received' ? 'Received' : 'Missing';
      tr.appendChild(st);
      var dt = document.createElement('td'); dt.textContent = r.received || ''; tr.appendChild(dt);
      var act = document.createElement('td');
      var tog = document.createElement('button');
      tog.type = 'button';
      tog.textContent = r.status === 'received' ? 'Mark missing' : 'Mark received today';
      tog.addEventListener('click', function () {
        if (r.status === 'received') { r.status = 'missing'; r.received = ''; }
        else { r.status = 'received'; r.received = today(); }
        save(); render();
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Delete';
      del.addEventListener('click', function () {
        rows = rows.filter(function (x) { return x !== r; });
        save(); render();
      });
      act.appendChild(tog); act.appendChild(del);
      tr.appendChild(act);
      tb.appendChild(tr);
    });
    $('counts').textContent = rows.length
      ? rows.length + (rows.length === 1 ? ' waiver' : ' waivers') + ': ' + got + ' received, ' + miss + ' missing.'
      : 'No waivers in your log yet.';
    $('table').hidden = rows.length === 0;
    $('csv').disabled = rows.length === 0;
    $('clearall').disabled = rows.length === 0;
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  $('status').addEventListener('change', function () {
    if ($('status').value === 'received' && !$('received').value) $('received').value = today();
    if ($('status').value === 'missing') $('received').value = '';
  });

  $('add').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = [];
    var sub = clean($('sub').value, 120);
    var pay = clean($('pay').value, 60);
    var amt = $('amount').value.trim();
    var type = $('type').value;
    var status = $('status').value;
    var rec = $('received').value;
    if (!sub) err.push('Enter the sub\'s name.');
    if (amt !== '' && (isNaN(amt) || Number(amt) < 0 || Number(amt) > 1e12)) err.push('Amount must be a number of zero or more.');
    if (!TYPES[type]) err.push('Choose a waiver type.');
    if (status !== 'received' && status !== 'missing') err.push('Choose a status.');
    if (status === 'received' && rec && !isDate(rec)) err.push('Date received is not a valid date.');
    if (rows.length >= 2000) err.push('The log holds up to 2,000 rows. Download a CSV and clear some rows first.');
    $('err').textContent = err.join(' ');
    if (err.length) return;
    rows.push({
      sub: sub, pay: pay,
      amount: amt === '' ? '' : Math.round(Number(amt) * 100) / 100,
      type: type, status: status,
      received: status === 'received' ? rec : ''
    });
    save(); render();
    $('pay').value = ''; $('amount').value = ''; $('received').value = '';
    $('status').value = 'missing';
    $('pay').focus();
  });

  function cell(v) {
    var s = String(v === undefined || v === null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  $('csv').addEventListener('click', function () {
    var lines = [['Sub', 'Pay app or date', 'Amount (USD)', 'Waiver type', 'Status', 'Date received'].join(',')];
    rows.forEach(function (r) {
      lines.push([r.sub, r.pay, r.amount, TYPES[r.type], r.status === 'received' ? 'Received' : 'Missing', r.received]
        .map(function (v, i) { return i === 2 && v !== '' ? String(v) : cell(v); }).join(','));
    });
    var blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lien-waiver-log.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $('clearall').addEventListener('click', function () {
    if (!window.confirm('Delete every row in your lien waiver log from this browser? This can\'t be undone.')) return;
    rows = [];
    try { localStorage.removeItem(KEY); } catch (e) {}
    render();
  });

  render();
})();
