# tiktok-clone

TikTok clone made in React Native using Expo

[This project was cloned from it's original creator github.com/matheuscastroweb](https://github.com/matheuscastroweb/tiktok-clone)

## Why and How this was recreated

I experienced neverending errors with incompatible or outdated packages (the original project is 3 years old) and decided it was easier was to create a fresh Expo project.

1. `create-expo-app` and choose BLANK with typescript
2. Added the original packages using `npx expo install NAME` expo version compatibility.
3. Copied over `App.tsx`, `server.json`, and the `/src` directory.
4. One minor edit a transform style on an Animated.View element the project worked perfectly.
