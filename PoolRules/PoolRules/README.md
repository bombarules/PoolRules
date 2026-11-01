# PoolRules

All seven pools in one app, in the Metro Governor style. A 3D map of Central Park's pools, their boiler rooms and heater rooms, and the roads residents walk to reach them.

## What it does

- **The map**: Splash Landing, Aviator, F-15, Jet Stream, Puddle Jumper, Maverick and Runway 35, each with its boiler room and heater room, connected by roads to the neighborhood.
- **Residents**: little people leave their homes, walk the roads to a pool, swim, and walk home. Each pool shows a face and a live swimmer count.
- **Mood**: residents are excited when the water is right and grumble or stay away when it isn't. Water level, pH, free chlorine, water temperature and hot showers all count. Unhappy pools get fewer visitors.
- **Tap a pool** to see swimmers, who is on the way, visits today, every reading with its ideal range, and fix it: top up water, add chlorine, acid or soda ash.
- **Plant**: the boiler room keeps the water warm, the heater room gives hot showers. Rooms that have been modeled open in 3D (Splash Landing, Aviator, Puddle Jumper, Runway 35).
- **Build**: add roads, pools, boiler rooms, heater rooms and homes, or bulldoze. Rooms serve the nearest pool within 4 tiles.

## Get the APK on your phone

1. On GitHub, create a new repository named `PoolRules`. Leave README, gitignore and license unchecked.
2. Unzip this project and upload everything inside the `PoolRules` folder to the repo: `.github`, `www`, `icons` and this README go at the top level. Commit.
   - If the `.github` folder doesn't upload, choose **Add file > Create new file**, type `.github/workflows/build-apk.yml` as the name, and paste in that file's contents.
3. Open the **Actions** tab. The build takes about 4 minutes.
4. Open the **Releases** page on your phone, tap `PoolRules.apk`, and install.

Everything works offline. Progress is saved on the phone.

## Change it

`www/game.js` holds the map, the pool chemistry and the people. The seven pools, their colours and which 3D rooms they open are in the `POOLS` list at the top. The 3D rooms live in `www/rooms`.
