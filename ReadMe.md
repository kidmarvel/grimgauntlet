# Grimoire Gauntlet

**Grimoire Gauntlet** is a browser-based 2D tactical RPG game built with HTML5 Canvas, JavaScript, and CSS. The game features:

- Grid-based player movement controlled by mouse.
- Spell casting with cooldowns, projectiles, and visual effects.
- Multiple enemy types with unique behaviors: Goblins, Archers, Brutes, and Bosses.
- Wave-based combat progression with increasing difficulty.
- XP and leveling system granting skill points and stat increases.
- Dynamic arena backgrounds that change by zone.
- Save and load game progress using localStorage.
- UI elements including health, XP bar, wave notifications, and spell hotkeys.

---

## Installation & Running

1. Clone or download this repository.
2. Ensure the following files are in the same directory:
   - `index.html`
   - `styles.css`
   - `game.js`
   - `main_theme.mp3` (background music)
   - Background images:
     - `forest_bg.jpg`
     - `ice_cave_bg.jpg`
     - `volcano_bg.jpg`
3. Open `index.html` in a modern web browser (Chrome, Firefox, Edge recommended).

---

## Controls

- **Move player:** Move your mouse over the canvas. The player snaps to the nearest grid cell.
- **Cast spells:** Press number keys 1-5 to cast unlocked spells.
- **Switch target:** Right-click on the canvas to cycle through enemies.
- **Audio toggle:** Use the 🔊 button on the main menu to mute/unmute music.

---

## Features

### Gameplay

- Enemies approach and attack the player.
- Spells have cooldowns and different effects (damage, slow, heal).
- Waves increase in difficulty with special boss waves every 5 waves.
- Level up to increase max HP and gain skill points for unlocking spells.

### Persistence

- Game progress saves automatically after each wave.
- Load saved games from the main menu “Continue” button.

---

## Assets

- Background images and music files are required to provide the full experience.
- Replace `main_theme.mp3` and backgrounds with your own if desired.

---

## Development

This project was built using vanilla JavaScript and HTML5 Canvas with no external dependencies.

Feel free to fork, modify, or contribute improvements!

---

## License

This project is open source and free to use for educational and personal projects.

---

**Enjoy playing Grimoire Gauntlet!**  
— David (Developer)
