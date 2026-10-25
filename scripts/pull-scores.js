// Reads new scores from the game's relay (a public ntfy.sh topic the game posts to), checks every number,
// recomputes the scores itself and merges them into leaderboard.json.
// One row per player (an anonymous id per device, shown only as a hash); their score is their best in each
// zone, added up. Names that break the rules go on the board as "Hero".
// Env: RELAY (topic URL), FILE (leaderboard path), SINCE (override, e.g. "24h").
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { nameProblem } = require('./name-filter.js');

const FILE = process.env.FILE || path.join(__dirname, '..', 'leaderboard.json');
const RELAY = process.env.RELAY || 'https://ntfy.sh/hazesquad-sg-scores-v2-k7q3';
const PAR = [120, 130, 200, 150, 210, 210];   // must match the game (src/client.js PAR)
const MIN_T = [40, 40, 60, 45, 60, 60];       // faster than this isn't believable
const MAX_T = 3600, MAX_HP = 200, KEEP = 100;
const levelScore = (li, t, hp) => Math.round(1000 * PAR[li] / Math.max(t, 20)) + 2 * Math.max(0, Math.round(hp));

function load() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { v: 2, updated: j.updated || null, since: j.since || 0, players: Array.isArray(j.players) ? j.players : [] };
  } catch (e) { return { v: 2, updated: null, since: 0, players: [] }; }
}
const okLevel = (li, r) => r && typeof r.t === 'number' && typeof r.hp === 'number' && isFinite(r.t) && isFinite(r.hp)
  && r.t >= MIN_T[li] && r.t <= MAX_T && r.hp >= 0 && r.hp <= MAX_HP;
const playerId = (uid) => crypto.createHash('sha256').update('hz:' + uid).digest('hex').slice(0, 12);
function cleanName(raw) {
  raw = String(raw || '');
  const cleaned = raw.replace(/[^\p{L}\p{N} ._'-]/gu, '').trim().slice(0, 16);
  return !cleaned || nameProblem(raw) || nameProblem(cleaned) ? 'Hero' : cleaned;
}

async function main() {
  const board = load();
  const since = process.env.SINCE || (board.since ? String(board.since) : '24h');
  const res = await fetch(`${RELAY}/json?poll=1&since=${encodeURIComponent(since)}`);
  if (!res.ok) throw new Error(`relay answered HTTP ${res.status}`);
  const msgs = (await res.text()).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } })
    .filter((m) => m && m.event === 'message' && typeof m.message === 'string').sort((a, b) => a.time - b.time);
  const rows = new Map(board.players.map((p) => [p.id, { ...p, lv: Array.isArray(p.lv) ? p.lv.slice(0, 6) : [] }]));
  let used = 0, skipped = 0, last = board.since || 0;
  for (const m of msgs) {
    last = Math.max(last, m.time || 0);
    let p = null;
    try { p = JSON.parse(m.message); } catch (e) { p = null; }
    if (!p || p.v !== 2 || typeof p.uid !== 'string' || !/^[a-z0-9]{16,32}$/.test(p.uid) || !Array.isArray(p.lv)) { skipped++; continue; }
    const id = playerId(p.uid), row = rows.get(id) || { id, name: 'Hero', score: 0, lv: [] };
    let any = false;
    p.lv.slice(0, 6).forEach((r, i) => {
      if (!r) return;
      if (!okLevel(i, r)) return;
      const sc = levelScore(i, Math.round(r.t * 10) / 10, Math.round(r.hp));
      any = true;
      if (!(row.lv[i] >= sc)) row.lv[i] = sc;
    });
    if (!any) { skipped++; continue; }
    for (let i = 0; i < 6; i++) if (typeof row.lv[i] !== 'number') row.lv[i] = null;
    row.name = cleanName(p.name);
    row.score = row.lv.reduce((a, s) => a + (s || 0), 0);
    row.date = new Date((m.time || Date.now() / 1000) * 1000).toISOString().slice(0, 10);
    rows.set(id, row); used++;
  }
  // scores posted the old way (rows "gh-<GitHub user>") give way once the same name is on the board from the game itself
  const live = [...rows.values()].filter((r) => !String(r.id).startsWith('gh-'));
  for (const r of [...rows.values()]) if (String(r.id).startsWith('gh-') && live.some((l) => l.name.toLowerCase() === String(r.name).toLowerCase() && l.score >= r.score)) rows.delete(r.id);
  const players = [...rows.values()].filter((r) => r.score > 0).sort((a, b) => b.score - a.score || String(a.date).localeCompare(String(b.date))).slice(0, KEEP);
  const changed = JSON.stringify(players) !== JSON.stringify(board.players);
  console.log(`${msgs.length} message(s) from the relay: ${used} used, ${skipped} skipped. ${players.length} player(s) on the board.${changed ? '' : ' No change.'}`);
  if (!changed) return;
  fs.writeFileSync(FILE, JSON.stringify({ v: 2, updated: new Date().toISOString(), since: last, players }, null, 1) + '\n');
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
