# Haze Squad

A 16-bit top-down game about haze in Singapore. Grab Grandpa's old vacuum, find friends to build your squad, and clean the air zone by zone, from Woodlands to the peat fires in Sumatra. Every level is based on a real haze event, with sources.

**Play:** https://sspandayang-star.github.io/haze-squad/ (after you switch on GitHub Pages, below).

## What's here

| File | What it does |
| --- | --- |
| `index.html` | The whole game in one file (art, sound and code inside). |
| `leaderboard.json` | The world leaderboard. The game reads it; only the robot below writes it. |
| `.github/workflows/leaderboard.yml` | The leaderboard robot (a GitHub Action that runs every 10 minutes). |
| `scripts/pull-scores.js` | Reads new scores, checks and recomputes them, and merges them into `leaderboard.json`. |
| `scripts/name-filter.js` | The name filter, shared with the game. |

## Switch it on (one time)

1. **Settings → Pages**: under *Build and deployment*, pick **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**. The game goes live at https://sspandayang-star.github.io/haze-squad/ within a few minutes.
2. **Settings → Actions → General**: allow actions to run (the default). The workflow asks for its own write permissions, so you don't need to change *Workflow permissions*.

## How the leaderboard works

- Each level's **speed score** = `1000 × par time ÷ your time` + `2 × health left`. Par times: 2:00, 2:10, 3:20, 2:30, 3:30, 3:30.
- A player's **leaderboard score** is their best speed score in each zone, added up. The board is one simple list: rank, name, score.
- Players don't post anything. When they set a new best, the game sends their bests to a public relay ([ntfy.sh](https://ntfy.sh), topic `hazesquad-sg-scores-v2-k7q3`) with their hero name and an anonymous random id for their device.
- Every 10 minutes the workflow:
  - reads what's new on the relay;
  - throws out anything impossible (for example a level faster than 40 seconds);
  - recomputes every score itself;
  - keeps one row per device (shown only as a short hash of the id) with its best in each zone, top 100;
  - commits `leaderboard.json` and asks GitHub Pages to republish.
- The player's own row shows straight away on their device; everyone else sees it after the next robot run (usually 10 to 20 minutes). If a score ever goes missing, the game sends it again when the player opens the board.

**Names.** The game refuses names with sexual, vulgar, racist, abusive or violent words, in English, Malay, Singlish, Mandarin and Tamil. That includes spaced-out letters, leetspeak and lookalike letters. The robot runs the same check (`scripts/name-filter.js`): a bad name goes on the board as **Hero**.

**Test the relay.** **Actions → Leaderboard → Run workflow**, tick *selftest*: it posts a test score to a separate test topic, reads it back and prints the result, without touching the board.

If you change the par times in the game (`PAR` in the game code), change `PAR` in `scripts/pull-scores.js` to match.

To reset the board, replace `leaderboard.json` with:

```json
{ "v": 2, "updated": null, "since": 0, "players": [] }
```

## Elsewhere

Opened anywhere else (a file on your computer, or another host), the game keeps your score on that device. On claude.ai, the published artifact keeps a shared board for everyone who opens it, and scores go up by themselves there too.
