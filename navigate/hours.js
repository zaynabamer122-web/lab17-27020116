/*
 * A small reader for OpenStreetMap "opening_hours" values.
 * It handles the common shapes: "24/7", "Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off",
 * "08:00-23:00", "Mo-Sa 09:00-13:00,14:00-18:00".
 * Anything else returns null, and the page shows the raw text with a
 * "Check timings before you go" note. We never guess hours.
 */
(function (global) {
  'use strict';

  var DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DAY_TOKEN = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
  var DAY_ITEM = DAY_TOKEN + '(?:-' + DAY_TOKEN + ')?';
  var RULE_RE = new RegExp('^(' + DAY_ITEM + '(?:\\s*,\\s*' + DAY_ITEM + ')*)(?:\\s*,\\s*PH)?\\s+(.+)$');

  function parseTime(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 48 || mi > 59) return null;
    return h * 60 + mi;
  }

  function parseDays(s) {
    var set = [];
    var parts = s.split(',');
    for (var p = 0; p < parts.length; p++) {
      var r = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/.exec(parts[p].trim());
      if (!r) return null;
      var a = DAYS.indexOf(r[1]);
      var b = r[2] ? DAYS.indexOf(r[2]) : a;
      for (var i = a; ; i = (i + 1) % 7) {
        if (set.indexOf(i) < 0) set.push(i);
        if (i === b) break;
      }
    }
    return set;
  }

  function parseRanges(s) {
    var out = [];
    var parts = s.split(',');
    for (var p = 0; p < parts.length; p++) {
      var m = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\+?$/.exec(parts[p].trim());
      if (!m) return null;
      var a = parseTime(m[1]), b = parseTime(m[2]);
      if (a == null || b == null) return null;
      if (b <= a) b += 1440; // runs past midnight
      out.push([a, b]);
    }
    return out;
  }

  /** Returns { week: [[ [startMin, endMin], ... ] x7], always?: true } or null. */
  function parse(value) {
    if (!value || typeof value !== 'string') return null;
    var v = value.trim();
    var week = [[], [], [], [], [], [], []];
    if (v === '24/7') {
      week.forEach(function (d) { d.push([0, 1440]); });
      return { week: week, always: true };
    }
    var rules = v.split(';').map(function (r) { return r.trim(); }).filter(Boolean);
    var any = false;
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (/^PH\b/.test(rule)) continue; // public-holiday-only rules don't describe a normal week
      var days, rest;
      var m = RULE_RE.exec(rule);
      if (m) {
        days = parseDays(m[1].replace(/\s/g, ''));
        rest = m[2].trim();
      } else {
        days = [0, 1, 2, 3, 4, 5, 6];
        rest = rule;
      }
      if (!days) return null;
      if (/^(off|closed)$/i.test(rest)) {
        days.forEach(function (d) { week[d] = []; });
        any = true;
        continue;
      }
      if (rest === '24/7') rest = '00:00-24:00';
      var ranges = parseRanges(rest);
      if (!ranges) return null;
      // In opening_hours, a later rule replaces earlier ones for the days it names.
      days.forEach(function (d) { week[d] = ranges.slice(); });
      any = true;
    }
    if (!any) return null;
    var openSomewhere = week.some(function (d) { return d.length; });
    if (!openSomewhere) return null;
    return { week: week };
  }

  /** Current weekday (0 = Monday) and minute of day in Lahore time. */
  function lahoreNow(date) {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date || new Date());
    var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
    return { day: DAY_SHORT.indexOf(get('weekday')), minute: (+get('hour')) * 60 + (+get('minute')) };
  }

  function fmtMinute(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    var ap = h < 12 ? 'am' : 'pm';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  /** { open: bool, text: string } for right now, or null if unknown. */
  function status(parsed, date) {
    if (!parsed) return null;
    if (parsed.always) return { open: true, text: 'Open 24 hours' };
    var now = lahoreNow(date);
    var WEEK = 10080;
    var t = now.day * 1440 + now.minute;
    var intervals = [];
    parsed.week.forEach(function (ranges, d) {
      ranges.forEach(function (r) {
        intervals.push([d * 1440 + r[0], d * 1440 + r[1], d]);
      });
    });
    var best = null;
    for (var i = 0; i < intervals.length; i++) {
      var iv = intervals[i];
      for (var k = -1; k <= 1; k++) {
        var s = iv[0] + k * WEEK, e = iv[1] + k * WEEK;
        if (t >= s && t < e) return { open: true, text: 'Open now · closes ' + fmtMinute(e) };
        if (s > t && (!best || s < best.s)) best = { s: s, d: (iv[2] + 7) % 7 };
      }
    }
    if (!best) return { open: false, text: 'Closed now' };
    var sameDay = best.s - t < 1440 - now.minute;
    var when = sameDay ? fmtMinute(best.s) : DAY_SHORT[best.d] + ' ' + fmtMinute(best.s);
    return { open: false, text: 'Closed now · opens ' + when };
  }

  /** [{ day: 'Monday', text: '9:00 am – 6:00 pm', today: bool }] */
  function weekLines(parsed, date) {
    if (!parsed) return [];
    var today = lahoreNow(date).day;
    return parsed.week.map(function (ranges, d) {
      var text = !ranges.length ? 'Closed'
        : ranges.map(function (r) {
          return (r[0] === 0 && r[1] === 1440) ? 'Open all day' : fmtMinute(r[0]) + ' – ' + fmtMinute(r[1]);
        }).join(', ');
      return { day: DAY_NAMES[d], text: text, today: d === today };
    });
  }

  global.OpeningHours = { parse: parse, status: status, weekLines: weekLines };
})(window);
