(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var rows = [];
  var MAX_ROWS = 2000;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayLocal() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }

  // Returns a local Date at midnight, or null if the text isn't a real date.
  function parseDate(s) {
    var m, y, mo, d;
    s = s.trim();
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { mo = +m[1]; d = +m[2]; y = +m[3]; }
    else return null;
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function splitLine(line) {
    var parts = line.indexOf('\t') >= 0 ? line.split('\t') : line.split(',');
    parts = parts.map(function (p) { return p.trim(); });
    // Allow commas inside the name: the last field is the date, the one before it the policy.
    if (parts.length > 3) parts = [parts.slice(0, parts.length - 2).join(', '), parts[parts.length - 2], parts[parts.length - 1]];
    return parts;
  }

  function analyse(text) {
    var today = todayLocal(), out = [];
    text.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim() || out.length >= MAX_ROWS) return;
      var p = splitLine(line), name = p[0] || '', policy = p.length >= 3 ? p[1] : '', raw = p.length >= 3 ? p[2] : (p[1] || '');
      var r = { line: i + 1, name: name.slice(0, 200), policy: policy.slice(0, 100), raw: raw.slice(0, 40), date: null, days: null };
      if (!raw) { r.status = 'No date'; r.cls = 'bad'; }
      else if (!(r.date = parseDate(raw))) { r.status = 'Unreadable date'; r.cls = 'bad'; }
      else {
        r.days = Math.round((r.date - today) / 86400000);
        if (r.days < 0) { r.status = 'Expired'; r.cls = 'expired'; }
        else if (r.days === 0) { r.status = 'Expires today'; r.cls = 'due'; }
        else if (r.days <= 30) { r.status = 'Due within 30 days'; r.cls = 'due'; }
        else { r.status = 'OK'; r.cls = 'ok'; }
      }
      out.push(r);
    });
    out.sort(function (a, b) {
      if (a.days === null && b.days === null) return a.line - b.line;
      if (a.days === null) return -1;
      if (b.days === null) return 1;
      return a.days - b.days;
    });
    return out;
  }

  function cell(tr, text, cls) { var td = document.createElement('td'); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td); }

  function render() {
    rows = analyse($('rows').value);
    var tb = $('tbody'); tb.textContent = '';
    var c = { Expired: 0, due: 0, OK: 0, bad: 0 };
    rows.forEach(function (r) {
      var tr = document.createElement('tr'); tr.className = r.cls;
      cell(tr, r.status, 'st'); cell(tr, r.name); cell(tr, r.policy);
      cell(tr, r.date ? iso(r.date) : (r.raw || '(blank)'));
      cell(tr, r.days === null ? '' : String(r.days));
      tb.appendChild(tr);
      if (r.cls === 'expired') c.Expired++; else if (r.cls === 'due') c.due++; else if (r.cls === 'ok') c.OK++; else c.bad++;
    });
    $('counts').textContent = '';
    [['Expired', c.Expired], ['Due within 30 days', c.due], ['OK', c.OK], ['Need a date', c.bad]].forEach(function (x) {
      var s = document.createElement('span'); s.textContent = x[0] + ': ' + x[1]; $('counts').appendChild(s);
    });
    $('asof').textContent = rows.length + ' rows, checked against today\'s date on this device: ' + iso(todayLocal()) + '.';
    $('out').hidden = rows.length === 0;
  }

  function csvField(v) {
    if (typeof v === 'number') return String(v);
    v = String(v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; // stop spreadsheets treating text as a formula
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function download(name, type, text) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function makeCsv() {
    var lines = ['Status,Name,Policy,Expiry,Days left'];
    rows.forEach(function (r) {
      lines.push([r.status, r.name, r.policy, r.date ? iso(r.date) : r.raw, r.days === null ? '' : r.days].map(csvField).join(','));
    });
    return lines.join('\r\n') + '\r\n';
  }

  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  // Fold lines longer than 75 octets (RFC 5545 3.1).
  function fold(line) {
    var bytes = new TextEncoder().encode(line);
    if (bytes.length <= 75) return line;
    var out = [], cur = '', curLen = 0, limit = 75;
    for (var ch of line) {
      var n = new TextEncoder().encode(ch).length;
      if (curLen + n > limit) { out.push(cur); cur = ' '; curLen = 1; limit = 75; }
      cur += ch; curLen += n;
    }
    out.push(cur);
    return out.join('\r\n');
  }
  function ymd(d) { return iso(d).replace(/-/g, ''); }

  function makeIcs() {
    var now = new Date(), stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Smallfire Lab//COI expiry checker//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    var n = 0;
    rows.forEach(function (r, i) {
      if (!r.date || r.days < 0) return;
      var end = new Date(r.date.getFullYear(), r.date.getMonth(), r.date.getDate() + 1);
      var title = 'COI expires: ' + r.name + (r.policy ? ' (' + r.policy + ')' : '');
      n++;
      L.push('BEGIN:VEVENT',
        'UID:' + stamp + '-' + i + '-' + Math.random().toString(36).slice(2, 10) + '@coi-expiry.smallfirelab.com',
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + ymd(r.date),
        'DTEND;VALUE=DATE:' + ymd(end),
        'SUMMARY:' + icsText(title),
        'DESCRIPTION:' + icsText('Certificate of insurance expiry date you entered in the COI expiry checker. Ask for a renewed certificate.'),
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(title + ' in 30 days'), 'TRIGGER:-P30D', 'END:VALARM',
        'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return { text: L.map(fold).join('\r\n') + '\r\n', count: n };
  }

  $('check').addEventListener('click', render);
  $('clear').addEventListener('click', function () { $('rows').value = ''; rows = []; $('out').hidden = true; });
  $('example').addEventListener('click', function () {
    var t = todayLocal(), add = function (d) { return iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() + d)); };
    $('rows').value = ['Acme Framing, General liability, ' + add(120), 'Acme Framing, Workers\' comp, ' + add(-12),
      'Green Lawn Co, General liability, ' + add(21), 'Bright Electric, Auto, ' + add(0), 'Blue Roofing, Umbrella, '].join('\n');
    render();
  });
  $('csv').addEventListener('click', function () { download('coi-expiry.csv', 'text/csv;charset=utf-8', makeCsv()); });
  $('ics').addEventListener('click', function () {
    var r = makeIcs();
    if (!r.count) { alert('No expiry dates today or later to put in a calendar file.'); return; }
    download('coi-expiry.ics', 'text/calendar;charset=utf-8', r.text);
  });
  window.__coi = { analyse: analyse, makeCsv: makeCsv, makeIcs: makeIcs, setRows: function (r) { rows = r; } };
})();
