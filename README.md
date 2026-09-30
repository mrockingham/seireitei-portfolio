# Seireitei — playable world study

Vite + React + TypeScript, React Three Fiber, Drei, and Rapier. Assets come from the prepared Blender v02 environment.

## Loading

The landing screen shows a large ring in the middle of the screen that fills as the world loads, with the stage underneath: *Downloading the world* (measured in megabytes, 70% of the ring), *Unpacking Seireitei*, *Preparing the effects*, and *Opening the gate*. Enter the world unlocks only once the world is really on screen: after the download, every shader is compiled in the background (with the scene held back so no frame stalls on an unfinished shader, and so nothing compiles mid-fight later), and then the first frames are drawn. The ring then turns blue and fades to reveal the gate. Code: `src/world-assets.ts` (download and phases), the warm-up in `src/World.tsx`, and `WorldLoader` in `src/App.tsx`.

## Run

```sh
npm install
npm run dev
```

Open the local Vite URL. Click **Enter the world**. WASD/arrows move, Shift runs, click-drag rotates the following camera, and scroll changes distance. M opens the world map; E inspects a nearby location; Escape opens/closes controls. The map supports quick travel while testing. On touch screens (phones and tablets, in either orientation) a joystick appears: put your thumb down anywhere in the lower-left of the screen and it centres there; a light push walks, pushing to the rim runs. One finger dragging elsewhere turns the camera, and two fingers pinch to zoom. The location card moves to the top-left out of your thumb’s way, and the Controls panel lists the touch controls. Fights, the website gallery, and the panels all use on-screen buttons, so they need no keyboard.

## Portfolio at a glance

For visitors who would rather not walk the world, one plain page holds everything: About, Experience (every role and highlight), Skills, the Websites (screenshots, descriptions, tags, Visit and Code links), how this site was built, and the contact links. It opens from *Short on time? See the portfolio at a glance* on the landing screen, from the **Portfolio** button in the header (on the landing screen and anywhere in the world, except during a fight), or from a shared link to `/#portfolio`. Tabs jump between sections; **Esc**, ×, or *Back to the world* closes it (the world pauses while it is open). On phones it fills the screen. Code: `src/QuickView.tsx`, reading the same `src/portfolio-content.ts` as the rest of the site.

## Implemented

- Loads the actual optimized GLB, without regenerating the environment.
- Kinematic capsule character with Rapier character-controller collisions, gravity, slope limits, snapping, and step handling.
- Sliding gates on entry and automatic doors near the two interiors; animated doors have synchronized kinematic collision bodies.
- Following camera with raycast obstruction checks.
- Eight discoverable locations (four encounters and four side stops), a route map, quick travel, return-to-gate, and fall respawn.
- Articulated procedural Ichigo stand-in (walk cycle, Shikai and Bankai outfits); still a placeholder, not a finished model.
- Four encounters, each a fully choreographed cinematic (see below): the Spirit Gate, the Division barracks, the Kuchiki garden, and the Sōkyoku Hill finale.
- Two side stops with looping sparring scenes, and a populated world: Soul Reapers at work, hell butterflies, birds, falling leaves, cherry petals, and division banners (see *Side stops* and *A living world*).
- The Twelfth Division lab, a round research lab whose wall of screens shows your websites (see *Twelfth Division lab*).

Audio, production mobile tuning, and deployment are not included. The map deliberately allows free travel without progression locks. Browser lighting differs from the Blender render.

## Commands

`npm run build` checks TypeScript and produces `dist/`. `npm run lint` runs the scaffold's linter. `npm run preview` serves the production build locally.

## Assets

`public/assets/seireitei/` contains the visible world and separate collision model. `src/world-manifest.json` provides door transforms and location data, using meters and Y-up coordinates. Keep both files at the same origin and scale.

The current scenery has 89 material primitives. The collision meshes are simplified; free exploration and camera behavior still need broader playtesting. No navmesh or combat AI is present. Fonts currently use Google Fonts with local sans-serif fallbacks.

## Spirit Gate fight

The first encounter starts when you walk onto the courtyard platform; Ichigo walks from where you stood onto his mark.

1. Rukia steps forward and dances Sode no Shirayuki: the blade spins around her wrist, turns white, gains a ring guard, and unfurls a white ribbon.
2. "Some no mai, Tsukishiro": a circle draws itself around Ichigo. He flash-steps back just as a column of ice erupts, then the column and its crystals shatter into shards, mist, and lingering snow.
3. Renji steps up: "Roar, Zabimaru." The blade splits into a segmented whip that lashes overhead into Ichigo's guard, circles, sweeps low, and is deflected again before reassembling on his shoulder.
4. The About Me panel appears (name, role, and summary from `about` in `src/portfolio-content.ts`).
5. *Continue* plays Ichigo's finishing move: a blue-white Getsuga Tenshō knocks both lieutenants down. Control returns on Ichigo's mark and they leave with a flash step.

Controls: **→** or *Next beat* steps one beat; **Esc** or *Skip to About Me* jumps to the panel; during the finishing move, **Esc** or *Skip* hands control back. *Replay encounter* restarts it from the beginning.

Code: `src/GateEncounter.tsx` directs it; `src/gate/` holds the timeline, choreography, shot list, Rukia and Renji figures, and effects (the Tsukishiro circle, frost, ice column, and crystals; Zabimaru's instanced plates, teeth, and links laid out along an animated Bezier). It reuses the finale's rig, Ichigo figure, Getsuga, particles, rings, flashes, and camera evaluator. On narrow screens the camera widens its lens and stays inside the walled courtyard. Development only: `window.__gate.start()`, `.seek(seconds)`, `.pause()`, and `.state()`; the finishing move runs at 100 s and later on the gate clock.

Measured in headless Chrome on the development machine's GPU at 2880×1620: every gate section averages 16.6–17.0 ms per frame (p95 ≈ 17.5 ms).

## Division barracks fight

The second encounter starts when you walk into the hall (on foot or by map travel); Ichigo walks from where you stood onto his mark. Five captains line the sides of the hall: Ukitake, Kyōraku, Unohana, Komamura, and Kurotsuchi. They turn their heads to follow the fight and flinch at the impacts.

1. Tōshirō steps out of the line, draws the sword from his back, and calls "Sit upon the frozen heavens, Hyōrinmaru."
2. His swing releases the ice dragon. It pours out of the blade, spirals up to the timber ceiling, and roars. Frost spreads across the floor and snow starts falling.
3. The dragon rears and dives into Ichigo's guard, driving him back and locking his legs in ice.
4. It circles the hall above the captains, then coils around Tōshirō.
5. The Experience panel appears: each role from `experience` in `src/portfolio-content.ts`, expandable, with its tech and highlights.
6. *Continue* plays Ichigo's finishing move. He breaks the ice and launches a Getsuga Tenshō. The dragon intercepts it and shatters from head to tail, and the wave reaches Tōshirō and drops him to one knee. Control returns on Ichigo's mark and Tōshirō leaves with a flash step.

Controls: **→** or *Next beat* steps one beat; **Esc** or *Skip to Experience* jumps to the panel; during the finishing move, **Esc** or *Skip* hands control back. *Replay encounter* restarts it from the beginning.

Code: `src/BarracksEncounter.tsx` directs the fight. `src/barracks/` holds the timeline, choreography, shot list, figures and effects:

- The Tōshirō and captain figures are built on the shared shihakushō body in `src/finale/shihakusho.tsx`, which also dresses Rukia and Renji.
- The dragon (`dragon.ts`) is 72 instanced ice segments. They are placed by arc length along a keyframed head path, with instanced spines, crystal wings, and a hinged jaw.
- The effects are the floor-frost shader, the leg-binding crystals, and the burst, ring and flash events.

On narrow screens the camera widens its lens and stays inside the hall. Development only: `window.__barracks.start()`, `.seek(seconds)`, `.pause()`, and `.state()`. The finishing move runs at 100 s and later on the barracks clock.

Measured in headless Chrome on the development machine's GPU at 2880×1620, every barracks section averages 16.6–16.7 ms per frame (p95 ≤ 19 ms), and a natural playthrough with the player in the hall had no frames over 34 ms. The finishing move is close to this GPU's budget at that resolution: one earlier run dipped to 35–45 ms frames there, which went away with the sun's shadows off or at 1× pixel ratio.

## Kuchiki garden fight

The third encounter starts when you cross the bridge into the garden (on foot or by map travel); Ichigo walks from where you stood onto his mark. Yoruichi watches from the edge of the veranda, one knee up.

1. Soi Fon draws the wakizashi from the small of her back. "Sting all enemies to death, Suzumebachi": the blade glows gold and shrinks into a stinger on her middle finger.
2. She flash-steps around Ichigo, leaving afterimages at three points, and stings him from behind. The Hōmonka, a black butterfly mark, blooms on his back. He spins with a backhand, but she is already back on her mark.
3. Shunkō: wind gathers at her feet, then erupts. Her haori tears away, and wind streaks, lightning, and a glow wrap her back and shoulders.
4. Three flash-step attacks, each blocked: a stinger lunge, a spinning kick at his left, and a dive from above. After each, she flips back out of reach.
5. The Skills panel appears (the skill groups from `skills` in `src/portfolio-content.ts`).
6. *Continue* plays Ichigo's finishing move. She lunges for the second sting (the butterfly flares), and the Getsuga Tenshō meets her crossed arms. Shunkō holds for a moment, then breaks, and she is thrown toward the veranda.
7. In slow motion, Yoruichi flash-steps off the veranda and catches her in mid-air. She lands with Soi Fon in her arms, and Soi Fon looks up at her. Control returns on Ichigo's mark, and Yoruichi leaves with her in a flash step. The butterfly stays on Ichigo's back until his Bankai.

Controls: **→** or *Next beat* steps one beat; **Esc** or *Skip to Skills* jumps to the panel; during the finishing move and the catch, **Esc** or *Skip* hands control back. *Replay encounter* restarts it from the beginning.

Code: `src/GardenEncounter.tsx` directs the fight. `src/garden/` holds the timeline, choreography, shot list, figures and effects:

- **Figures.** Soi Fon is built on the shared shihakushō body, now with bare shoulders and a sash slot. Yoruichi has her own slim body on the same joint layout. The braids, ponytail and sash tails are chains that hang with gravity and sway.
- **Movement.** World paths move the fighters between keyframes. They handle flash steps (the fighter vanishes and reappears), flips pivoting about the hips, and Soi Fon's flight. Once caught, she is carried from Yoruichi's chest joint.
- **Afterimages.** Four translucent copies of Soi Fon replay where she was a moment earlier.
- **Slow motion.** The catch plays in slow motion by running the garden clock slower (`gardenRate`), so everything stays a pure function of time.
- **Effects.** The Shunkō aura (wind shell, instanced lightning arcs, looping motes, glow), the butterfly mark, flash-step streaks, and burst, ring and flash events.

On narrow screens the camera widens its lens and stays inside the garden. The reveal and final shots switch to portrait framings (`Shot.portrait` in `src/finale/camera.ts`). Development only: `window.__garden.start()`, `.seek(seconds)`, `.pause()`, and `.state()`. The finishing move runs at 100 s and later on the garden clock.

Measured in headless Chrome on the development machine's GPU at 2880×1620, every garden section averages 16.6–16.7 ms per frame (p95 ≤ 18.4 ms). A natural playthrough with the player in the garden had no frames over 34 ms.

## Side stops

Three stops sit beside the route and play on a loop while you watch; they are marked with ✦ on the map (the Twelfth Division lab, described below, is the fourth side stop). None takes over the camera. They hold still while a fight is playing, and the training grounds and the Eleventh Division yard are skipped entirely when the camera is more than 85 m away.

**Training grounds.** A roped earth ring in the open lot south-east of the gate, beside the street to the barracks, with a wall, trees, a tool shed, straw targets, a 空座 banner, and two onlookers. Chad, Uryū, and Orihime spar on an 18-second loop:

1. Uryū forms his bow of light and fires a volley. Chad's right arm armours into Brazo Derecha de Gigante and blocks it.
2. Chad answers with El Directo. Uryū slips aside with Hirenkyaku, and Orihime's fairies fly from her hairpins to form Santen Kesshun, which catches the stray blast.
3. Uryū fires Licht Regen skyward, and the arrows rain down around Chad, who guards and drops to a knee.
4. Orihime runs to him and heals him inside Sōten Kisshun. Chad gives a thumbs-up, Orihime cheers, and Uryū pushes up his glasses. They reset.

**Your section.** Arriving at the training grounds shows a card read from `trainingSection` in `src/portfolio-content.ts` (heading, body, tool groups shown as tags, and optional links). It currently reads *How this site was built*: Blender, Blender Python, and glTF for the world; Three.js, React, TypeScript, React Three Fiber, Drei, Rapier physics, and WebGL shaders in the browser; Vite and oxlint for the build. Close it with ×, reopen it with **E**.

**Eleventh Division yard.** A roped sand ring on the open strip behind the barracks, beside the street to the Kuchiki compound, with 十一番隊 banners, a weapon rack, a barrel, and three cheering division members. Kenpachi lounges on a bench with his sword on his shoulder, Yachiru on his other shoulder and a sake jar beside him. Ikkaku and Yumichika spar on a 16-second loop:

1. Ikkaku joins his sword and sheath into Hōzukimaru, spins it, and attacks: a thrust, a low sweep, and a flurry that Yumichika parries.
2. Ikkaku splits the spear into three chained sections and whips it around behind Yumichika, who blocks over his shoulder.
3. They break apart. Yumichika poses, Ikkaku laughs, Kenpachi laughs, and Yachiru cheers.
4. They rush into a blade lock with grinding sparks, part, circle each other, and reset.

Code: `src/TrainingGrounds.tsx` and `src/EleventhYard.tsx` direct the stops. `src/stops/` holds the figures, the choreography, and the effects: arrows, El Directo, Santen Kesshun, Sōten Kisshun, and fairies.

- Chad, Uryū, and Orihime use a new everyday-clothes body (`stops/body.tsx`) on the same joint layout as the fighters.
- The Eleventh Division figures use the shared shihakushō body.
- World paths live in `src/finale/paths.ts`, shared with the garden fight.

**Captains' training arena.** A walled sand arena in the open north-west corner, west of Sōkyoku Hill and beside the hill's cliff. It has 七番隊 and 九番隊 banners, tiered stands behind the far wall, corner lanterns, and a weapon rack. You watch from the south side, through a low railing and an open gateway roped off with a shimenawa; five Seventh and Ninth Division members watch too, cheering the big moments. Sajin Komamura and Kaname Tōsen spar on a 26-second loop:

1. They clash three times.
2. Komamura raises his sword, and Tenken's phantom armoured arm reaches out of the air behind him, bringing a vast blade down where Tōsen stood. Tōsen flash-steps aside.
3. Tōsen's Bankai: Suzumushi whirls on its ring guard, ten silver rings fly out and circle him, then rise. Enma Kōrogi's black dome swells over them both, with the rings around its crown.
4. The dome shudders and cracks with light. Komamura's Bankai, Kokujō Tengen Myō'ō, grows inside it: its sword and horned, red-masked helmet break through the top, then the dome shatters into black shards and Tōsen is thrown clear.
5. The giant (about 13 m tall) mirrors Komamura: it roars, raises its sword, and brings it down into the ground where Tōsen landed. He flash-steps away again.
6. The giant fades from the helmet down into dark mist, and the captains walk back to their marks.

This stop has the same hold-still rule during fights (it rests on the opening stand-off) and is skipped when the camera is more than 110 m away; the giant is visible from further off than the other stops. Code: `src/CaptainsArena.tsx` directs it; `src/stops/arena.ts` holds the beats, paths, and poses, `arena-figures.tsx` the figures, and `arena-fx.ts` Tenken, the rings, and the dome. The giant is the shared shihakushō body scaled up 7.2×, dressed in armour, so it follows Komamura's pose track exactly; during the slash its blade is aimed at the strike point. It fades with a clipping plane. Measured in headless Chrome at 2880×1620, standing at the gate for two full loops: 16.7 ms average (p95 ≤ 18.3 ms).

Development only: `window.__training.freeze(seconds)`, `window.__eleventh.freeze(seconds)`, and `window.__arena.freeze(seconds)` pin a loop for review; `freeze()` releases it.

## Finding your way

The white stone road is the route, and it is now marked so you can follow it:

- **Aisle lights.** Like the floor lighting in an airliner aisle, both edges of the road carry a thin dark track set with small blue lights every 0.9 m. On the stretch from where you stand to your next fight the lights are brighter and a soft glow runs along them toward it; the rest of the route stays faintly lit. Once all four fights are done, the whole route glows softly.
- **Floor chevrons.** Small blue chevrons are lit into the paving every 11 m (and on the switchback stairs), brightening as the running glow passes. If you jump past your next fight on the map, the chevrons on that stretch turn around and point back to it. They fade out in the distance.
- **Signposts.** Nine wooden signposts stand at the junctions, with arrow-shaped boards (number or ✦, name in English, a line of Japanese) pointing to the fights and the side stops. The compound's east wall has no gate, so from the corner behind the Eleventh Division yard the route heads south, then goes around the house (along the lane between the houses, past the house, and west along the paving north of the lab) and turns north straight onto the bridge, rather than cutting across the stream-side lawn; signposts mark each turn.
- **The lab.** An English plaque (*Research & Development Institute*) now sits above the 技術開発局 one, and a free-standing screen by the door, facing the gate, cycles through the websites with their titles under a *Websites · Step inside to browse* header.

All of this is hidden while a fight plays or while you browse the websites. Code: `src/route/route.ts` (the route polyline, from the world manifest's ROUTE markers), `src/route/signs.ts`, and `src/RouteGuide.tsx`. Development only: `window.__route.next(stage)` previews the guide as if that fight were next; `next()` releases it.

## A living world

`src/AmbientLife.tsx` directs everything below; `src/life/` defines who is where and what they do.

- **Twenty-one Soul Reapers with jobs:** two gate guards, a pair patrolling the gate street, someone sweeping under a tree, two chatting behind the barracks, and a messenger walking from the barracks to the Kuchiki compound. There are also two doing sword drills at the foot of the hill stairs, a patrol in the lane east of the barracks, and onlookers at the three sparring stops who cheer the big moments. Nearby Soul Reapers glance at you as you pass.
- **Hell butterflies and birds.** Black hell butterflies with a violet sheen flutter around the landmarks, and two flocks of birds wheel over the city. Both are instanced.
- **Leaves, petals, and banners.** Leaves fall from the trees and cherry petals drift over the Kuchiki garden, each as one GPU particle system. Nobori banners wave in a vertex shader: 瀞霊廷 at the gate and 十番隊 at the barracks.

**Keeping it cheap.**

- **Figures:** every new figure is collapsed at load into rigidly skinned meshes (`src/finale/skin.ts`), so it costs 1–2 draw calls instead of ~40. The joints stay the bones, so all pose tracks work unchanged.
- **Hiding far things:** people far from the camera are hidden and skipped.

Measured in headless Chrome on the development machine's GPU at 2880×1620:

- **Standing at either side stop:** 16.7 ms average (p95 ≤ 19.2 ms).
- **Fight sections in steady state:** still 16.6–16.8 ms average (p95 ≤ 18.7 ms).
- **First ~10 seconds after entering:** occasional 25–30 ms frames while the browser warms up the new per-frame code.

### Rendering performance across the world

App reports the player's position several times a second. Each report used to re-render the whole 3D tree, including every character's meshes, and so did every change of beat in a fight. That caused 35–60 ms hitches while exploring and at phase changes. The world, the encounter directors, the side stops, the ambient life, and every character figure are now memoized, so they re-render only when their own props change. Exploring at the gate went from a p95 of about 32 ms to 17.7 ms.

## Twelfth Division lab

Mayuri's Research and Development Institute stands in the open lot west of the gate courtyard. It is marked ✦ on the map, between the gate and the training grounds. The lab is a round white drum under a low dome, with a 技術開発局 plaque over sliding steel doors and a 十二番隊 banner outside. The doors open as you approach.

Inside:

- **The screen wall.** On the far wall, eight large screens in two rows of four show your websites. They are surrounded by a band and columns of smaller data screens with animated waveforms, radar, bars, and readouts.
- **The console.** A curved console with keyboards and tilted screens, where Nemu types and glances up at visitors.
- **Mayuri.** A rainbow hologram of Mayuri on a projector. He alternates between thinking and presenting, turns to face you, and flickers now and then.
- **The rest of the room.** Server racks with blinking lights, two bubbling specimen tanks, cables, and a glowing circuit floor.

**Your websites.** Add them to `websites` in `src/portfolio-content.ts`, one entry each:

```ts
{ title: 'Site name', url: 'https://example.com', description: 'What it is and what you built.', image: 'my-site.png', tags: ['React', 'Three.js'] }
```

Put screenshots in `public/assets/websites/` (16:9, 1280×720 or larger); they are cropped to fill the screen. A site without a screenshot gets a drawn page with its title and address. Eight sites fit on the wall at once; with more, the wall pages through them as you browse. With no sites listed, the eight screens show clearly labelled placeholders ("Your website 01" to "08"). An optional `repo` adds a *Code ↗* link beside *Visit site*.

The wall currently shows eight sites: 2nd & 15, Mustang Unleashed, the Ford Special Vehicle Registry, DevErNote, Legacy Hub, Bridges to Prosperity, Conway's Game of Life, and Dad's Memory. Their descriptions come from the résumé, the project list on mikeres.com, or the sites' own pages, and the screenshots were taken from the live sites.

**Browsing.**

- **Open:** press **E** at the lab (the location card reads *Browse the websites*), or click any screen.
- **Move between sites:** the camera glides to frame the selected screen, and a panel shows its title, description, tags, and a *Visit site ↗* link (opens in a new tab). **←/→** or **A/D** step through the sites.
- **Close:** **Esc** or × returns to walking.
- **Phones:** the panel becomes a bottom sheet and the screen is framed above it.

Code: `src/Lab.tsx` directs the lab: the screens, their textures, the gallery camera, Mayuri, Nemu, and the doors. `src/lab/` holds the rest:

- `layout.ts`: positions and the gallery framing;
- `building.ts`: architecture, furniture, and colliders;
- `screens.ts`: page textures, data screens, LEDs, the floor, and the hologram material;
- `figures.tsx`: Nemu.

**Keeping it cheap.** The lab's hundred-odd static pieces are baked into one mesh per material. Furniture inside casts no sun shadows, since the drum and dome already shade the room, and the large interior surfaces use Lambert shading. The data screens and LEDs are instanced shaders. The interior, Mayuri, and Nemu are hidden when the camera is more than 45 m away.

Measured in headless Chrome on the development machine's GPU at 2880×1620, while other applications were loading the machine:

- **Outside and browsing:** 16.7–17.8 ms average, about the same as the spawn point measured in the same runs.
- **Inside, walking:** about 1 ms slower.
- **From the Eleventh Division yard:** hiding the whole lab saved under 1 ms, within the run-to-run noise.

## Sōkyoku Hill finale

The final encounter is a ~24 second cinematic followed by the final portfolio section:

1. Byakuya raises his sword; the blade scatters into swirling Senbonzakura petals.
2. Ichigo (white shihakushō, black belt) winds up and launches the first Getsuga Tenshō.
3. The petals gather into a shield that visibly stops the wave (flash, sparks, ripple).
4. Bankai: Byakuya lets his reformed sword sink into the ground; two rows of giant blades erupt, gleam, and dissolve from the tips into a dense petal storm that closes around Ichigo.
5. Ichigo's Bankai bursts the storm open; his costume wipes from feet to head into a black coat, red belt, and black sword.
6. A black-and-crimson Getsuga Tenshō splits the petal torrent and knocks Byakuya down.
7. The petals fall and settle, the light turns golden, and the final portfolio panel appears.

The finale starts when you reach the summit (on foot or by map travel); Ichigo walks from where you stood onto his mark. Controls during the finale: **Esc** or *Skip to portfolio* jumps straight to the final section; **→** or *Next beat* steps one beat. *Replay the finale* (in the panel) and *Replay encounter* (after finishing) restart it with the white outfit, petals, blades, positions, and camera reset. *Finish the journey* opens the Senkaimon: two lacquered gate doors (穿 and 界) slide shut across the screen with hell butterflies crossing them, Ichigo is carried to the front of the Twelfth Division lab while they are closed, and they open onto white light. He lands in a column of light with a ring across the paving, rising sparks, and hell butterflies spiralling away, facing the lab's door, and a *Journey complete* note offers to browse the websites. The transition takes about four seconds, and input is paused until it ends; with reduced motion it is a two-second fade. Code: `finishJourney` in `src/App.tsx` (the timing and the on-screen gate) and `src/ArrivalFx.tsx` (the arrival). Map travel works as before.

### How it works

- `src/finale/timeline.ts` holds every beat time. One clock (owned by `App`, advanced in `HillEncounter.tsx`) drives poses, effects, lights, camera shots, and the environment tint as pure functions of time. Skip and replay therefore land on consistent frames, and timing is frame-rate independent (frame deltas are clamped at 0.1 s, so a hidden tab pauses rather than jumps).
- Petals: one `InstancedMesh` of 3,200 curved petals (`petals.ts`), each following a chain of formations. Giant blades: one `InstancedMesh` (`blades.ts`) with a shader dissolve and a matching shadow depth material. Sparks and dust: two GPU `Points` systems whose bursts are baked from the timeline (`effects.ts`).
- Characters (`characters.tsx`) are original, procedural, low-poly rigs with named joints. Keyframed performances live in `choreography.ts`; camera shots live in `camera.ts`.
- Ichigo's costume change uses per-material clipping planes (`renderer.localClippingEnabled`).
- `prefers-reduced-motion` disables camera shake and shortens the letterbox and caption animations.
- Finale shaders are compiled while the world loads, and shadow variants are warmed off-screen as you approach the hill, so nothing compiles mid-fight.
- The encounter name labels (drei `Html occlude`) now test occlusion against the simplified collision model instead of every visual triangle. That per-frame raycast was the main cost whenever the camera moved on the hill.
- Measured in headless Chrome on the development machine's GPU at 2880×1620 (1920×1080 at 1.5× DPR): every finale section averages 16.6 ms per frame (p95 ≈ 17 ms). Other hardware, especially mobile, still needs testing.
- Development only: `window.__finale.start()`, `.seek(seconds)`, `.pause(true|false)`, and `.state()` help review individual beats; `window.__finaleCapture()` returns the current frame as a JPEG data URL for automated screenshots, and `window.__three` exposes the renderer, scene, and camera for profiling.

### Placeholder status

Everything in the four cinematics, the side stops, the lab, and the ambient life is **procedural placeholder art** generated in code. That covers:

- **Characters:** Ichigo, Byakuya, Rukia, Renji, Tōshirō, the five watching captains, Soi Fon, Yoruichi, Chad, Uryū, Orihime, Kenpachi, Yachiru, Ikkaku, Yumichika, Mayuri (as a hologram), Nemu, Komamura, Tōsen, Kokujō Tengen Myō'ō, and the Soul Reaper crowd.
- **Weapons and powers:** swords, petals, blades, ice, the ice dragon, the segmented whip, Suzumebachi, Shunkō, the butterfly mark, the spirit bow and arrows, El Directo, Orihime's shields and fairies, Hōzukimaru, Tenken's phantom arm, and Enma Kōrogi's rings and dome.
- **Everything else:** the lab building, its screens and furniture, banners, butterflies, birds, energy effects, and particles.

The banners draw their kanji with the viewer's system fonts. No third-party models, textures, or audio are used. All portfolio text lives in `src/portfolio-content.ts`: the four chapter panels, the lab's websites, and the training-grounds section. The content comes only from the résumé (mikeres2pg.docx) and mikeres.com; nothing was invented. The phone number on the résumé is deliberately left off the public site. 
