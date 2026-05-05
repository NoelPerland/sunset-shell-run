# Sunset Shell Run

Small web-based Phaser 3 platformer inspired by a sunny pixel-art summer map. It is original, playable, and built for easy reading.

## Controls

- `A` / `D` or arrow keys: move
- `W` / `S` or arrow keys: look up/down
- `Space`: jump, press again in air for double jump
- `F` / `J`: shoot
- Hold `Shift`: run
- On world map, walk to a world node and press `Enter` to start it
- `Enter`: next level after completion
- `M`: return to world map
- `R`: restart

## Goal

Cross each themed level, collect star fruit, bounce on crabs, avoid shell spikes, use springs, hit the checkpoint, and reach the finish flag.
Defeat the boss near the end before the finish flag unlocks.

Powerups:

- Heart: restores one life.
- Shield: blocks next hit.
- Speed boot: faster movement.
- Triple gem: fires three shots.

## Levels

- Summer Shore
- Snowdrift Coast
- Sunbaked Dunes
- Ember Keep

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Files

- `src/main.js`: Phaser scene, level layout, player movement, hazards, win/lose flow.
- `src/styles.css`: DOM HUD and responsive shell.
- `index.html`: game container and HUD markup.
- `public/assets/sprites/`: AI-generated sprite atlas and cropped transparent game sprites.
- `public/assets/sprites/atlas-winter.png`, `atlas-desert.png`, `atlas-lava.png`: AI-generated theme atlases.
- `public/assets/sprites/world-map.png`: AI-generated overworld selection map.
- `public/assets/sprites/tile-winter.png`, `tile-desert.png`, `tile-lava.png` plus matching water/prop/spring/spike/enemy/collectible/flag sprites: cropped from those theme atlases, not recolored from the summer map.
- `screenshot-sprites.png`: current browser screenshot using generated sprites.

## Agent Pipeline Used

- Web Researcher: Phaser Arcade Physics, camera, scaling, and platformer patterns.
- Image Game Research Designer: translated summer pixel-map image into playable level structure.
- Game Designer: one-level arcade loop with clear goal.
- Phaser Game Engineer: Vite + Phaser implementation.
- Juice UX Artist: particles, camera shake/flash, sound cues, readable HUD.
- Code Teacher: named constants, compact file map, readable methods.
- Playtest QA: build and runtime checks.
