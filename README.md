# Haze Squad

A 16-bit top-down game about haze in Singapore. Grab Grandpa's old vacuum, find friends to build your squad, and clean the air zone by zone, from Woodlands to the peat fires in Sumatra. Every level is based on a real haze event, with sources.

**Play:** https://sspandayang-star.github.io/haze-squad/ (after you switch on GitHub Pages, below).

## What's here

| File | What it does |
| --- | --- |
| `index.html` | The whole game in one file (art, sound and code inside). |
| `leaderboard.json` | The world leaderboard. The game reads it; only the robot below writes it. |
| `.github/workflows/score.yml` | The scoreboard robot (a GitHub Action). |
| `scripts/record-score.js` | Checks a posted score, recomputes it and merges it into `leaderboard.json`. |
| `scripts/name-filter.js` | The name filter, shared with the game. |

## Switch it on (one time)

1. **Settings → Pages**: under *Build and deployment*, pick **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**. The game goes live at https://sspandayang-star.github.io/haze-squad/ within a few minutes.
2. **Settings → General → Features**: make sure **Issues** is ticked (it is by default).
3. **Settings → Actions → General**: allow actions to run (the default). The workflow asks for its own write permissions, so you don't need to change *Workflow permissions*.

## How the leaderboard works

- Each level's **speed score** = `1000 × par time ÷ your time` + `2 × health left`. Par times: 2:00, 2:10, 3:20, 2:30, 3:30, 3:30.
- A **full run** score is the sum of all six levels, and only counts if no level was retried.
- On the game's **Leaderboard** screen, **Post my best scores** opens a ready-made GitHub issue titled `Score: …`. The player presses **Create** (a free GitHub account is needed).
- The workflow then:
  - reads the numbers in the issue;
  - throws out anything impossible (for example a level faster than 40 seconds);
  - recomputes the scores itself;
  - keeps each GitHub account's best entry on each board, top 50;
  - commits `leaderboard.json`, replies with the player's ranks and closes the issue.
- GitHub Pages republishes within a minute or two, and the game shows the new board.

**Names.** The game refuses names with sexual, vulgar, racist, abusive or violent words, in English, Malay, Singlish, Mandarin and Tamil. That includes spaced-out letters, leetspeak and lookalike letters. The robot runs the same check (`scripts/name-filter.js`): a bad name goes on the board as **Hero**, and the issue's title and text are wiped.

If you change the par times in the game (`PAR` in the game code), change `PAR` in `scripts/record-score.js` to match.

To reset the board, replace `leaderboard.json` with:

```json
{ "updated": null, "run": [], "levels": [[], [], [], [], [], []] }
```

## Elsewhere

Opened anywhere else (a file on your computer, or another host), the game keeps scores on that device. On claude.ai, the published artifact keeps a shared board for everyone who opens it.
