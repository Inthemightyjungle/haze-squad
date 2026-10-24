// Reads a "Score: …" issue made by the game's "Post my best scores" button,
// checks every number, recomputes the scores and merges them into leaderboard.json.
// One entry per GitHub account per board; a new entry only replaces an older one if it scores higher.
// Writes a short reply for the issue to $GITHUB_OUTPUT (key: message).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'leaderboard.json');
const LEVELS = ['North', 'East', 'Central', 'South', 'West', 'Sumatra'];
const PAR = [120, 130, 200, 150, 210, 210];   // must match the game (src/client.js PAR)
const MIN_T = [40, 40, 60, 45, 60, 60];       // faster than this isn't believable
const MAX_T = 3600, MAX_HP = 200, KEEP = 50;

const levelScore = (li, t, hp) => Math.round(1000 * PAR[li] / Math.max(t, 20)) + 2 * Math.max(0, Math.round(hp));
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function reply(msg) {
  console.log(msg);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `message<<EOF_MESSAGE\n${msg}\nEOF_MESSAGE\n`);
}
function load() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { updated: j.updated || null, run: Array.isArray(j.run) ? j.run : [], levels: LEVELS.map((_, i) => (Array.isArray(j.levels) && Array.isArray(j.levels[i]) ? j.levels[i] : [])) };
  } catch (e) { return { updated: null, run: [], levels: LEVELS.map(() => []) }; }
}
function okLevel(li, r) {
  return r && typeof r.t === 'number' && typeof r.hp === 'number' && isFinite(r.t) && isFinite(r.hp)
    && r.t >= MIN_T[li] && r.t <= MAX_T && r.hp >= 0 && r.hp <= MAX_HP;
}
// put an entry on a board: one per user, keep the better score, sort, trim
function place(list, entry) {
  const i = list.findIndex((e) => e.user === entry.user);
  if (i >= 0) {
    if (list[i].score >= entry.score) { list[i].name = entry.name; return { added: false, rank: rankOf(list, entry.user), old: list[i].score }; }
    list.splice(i, 1);
  }
  list.push(entry);
  list.sort((a, b) => b.score - a.score || (a.t ?? a.time) - (b.t ?? b.time));
  list.splice(KEEP);
  const rank = rankOf(list, entry.user);
  return { added: rank > 0, rank };
}
const rankOf = (list, user) => list.findIndex((e) => e.user === user) + 1;

function main() {
  const body = process.env.ISSUE_BODY || '', user = (process.env.ISSUE_USER || 'unknown').slice(0, 39);
  const m = body.match(/```json\s*([\s\S]*?)```/);
  let p = null;
  try { p = m ? JSON.parse(m[1]) : null; } catch (e) { p = null; }
  if (!p || typeof p !== 'object') {
    reply(`Hi @${user}! I couldn't find any scores in this issue. Open the game, go to **Leaderboard** and press **Post my best scores**, then submit the issue without changing the block at the bottom.`);
    return;
  }
  const name = String(p.name || user).replace(/[^\p{L}\p{N} ._'-]/gu, '').trim().slice(0, 16) || user;
  const date = new Date().toISOString().slice(0, 10);
  const board = load(), lines = [], skipped = [];

  // full run: all six levels, each one believable
  if (p.run && Array.isArray(p.run.levels)) {
    const lv = p.run.levels;
    if (lv.length === LEVELS.length && lv.every((r, i) => okLevel(i, r))) {
      const score = lv.reduce((a, r, i) => a + levelScore(i, r.t, r.hp), 0), time = Math.round(lv.reduce((a, r) => a + r.t, 0) * 10) / 10;
      const res = place(board.run, { name, user, score, time, date });
      lines.push(res.added ? `- **Full run:** ${fmt(score)} in ${fmtTime(time)}, rank **#${res.rank}**` : res.old != null ? `- Full run: ${fmt(score)} (your ${fmt(res.old)} on the board is already higher)` : `- Full run: ${fmt(score)} (not in the top ${KEEP} yet)`);
    } else skipped.push('the full run');
  }
  // best per level
  (Array.isArray(p.lv) ? p.lv : []).slice(0, LEVELS.length).forEach((r, i) => {
    if (!r) return;
    if (!okLevel(i, r)) { skipped.push(`level ${i + 1}`); return; }
    const t = Math.round(r.t * 10) / 10, hp = Math.round(r.hp), score = levelScore(i, t, hp);
    const res = place(board.levels[i], { name, user, score, t, hp, date });
    lines.push(res.added ? `- **Level ${i + 1} (${LEVELS[i]}):** ${fmt(score)} in ${fmtTime(t)}, rank **#${res.rank}**` : res.old != null ? `- Level ${i + 1}: ${fmt(score)} (your ${fmt(res.old)} is already higher)` : `- Level ${i + 1}: ${fmt(score)} (not in the top ${KEEP} yet)`);
  });

  if (!lines.length) {
    reply(`Hi @${user}! I couldn't add anything from this issue${skipped.length ? ` (these didn't look right: ${skipped.join(', ')})` : ''}. Finish a level, then post again from the game's **Leaderboard** screen.`);
    return;
  }
  board.updated = new Date().toISOString();
  fs.writeFileSync(FILE, JSON.stringify(board, null, 1) + '\n');
  reply(`Thanks for cleaning the air, **${name}**! Here's what I recorded:\n\n${lines.join('\n')}${skipped.length ? `\n\nI skipped ${skipped.join(', ')} because the numbers didn't look right.` : ''}\n\nThe leaderboard updates on the game page in a minute or two.`);
}
main();
