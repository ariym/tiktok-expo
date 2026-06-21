# tiktok-clone

TikTok clone made in React Native using Expo

[This project was cloned from it's original creator github.com/matheuscastroweb](https://github.com/matheuscastroweb/tiktok-clone)

## Why and How this was recreated

I experienced neverending errors with incompatible or outdated packages (the original project is 3 years old) and decided it was easier was to create a fresh Expo project.

1. `create-expo-app` and choose BLANK with typescript
2. Added the original packages using `npx expo install NAME` expo version compatibility.
3. Copied over `App.tsx`, `server.json`, and the `/src` directory.
4. One minor edit a transform style on an Animated.View element the project worked perfectly.

## Local video streaming

The app can read its feed from a local backend server that streams files from a folder on your machine, including videos inside subfolders.

1. Copy `.env.example` to `.env`.
2. Set `VIDEO_DIR` to the absolute path that contains your local video files.
3. If you are testing on a physical phone, set `EXPO_PUBLIC_VIDEO_SERVER_URL` to your computer's LAN URL, for example `http://192.168.1.20:3333`.
4. Start the backend with `npm run video-server`.
5. Start Expo with `npm start`.

`GET /api/feed` returns the local video files in a new random order each time. The refresh button in the app fetches that endpoint again, so the list is randomized on refresh too.
