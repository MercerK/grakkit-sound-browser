# Grakkit Sound Browser

This is a plugin for [Grakkit](https://github.com/grakkit/grakkit). When added to your project and initialize, you can call the Sound Browser in Minecraft via `/soundbrowser`, which will open up a GUI of every Minecraft Sound that you can play. This is useful for developers wanting to find a sound quickly, but don't want to type in every sound command to play it.

# Getting Started

- Run `npm install grakkit-sound-browser`.
- Import named export, `SoundBrowser`.
- Once imported, you'll need to start it by running `SoundBrowser.initialize()`.

```ts
import { SoundBrowser } from 'grakkit-sound-browser'

SoundBrowser.initialize()
```

From there, launch a Minecraft server with Grakkit and the imported plugin. Join the game and run `/soundbrowser`. This will open up a GUI with 30+ pages. Click on a sound to play it, change the pitch, and so forth.

You can filter the list by running `/soundbrowser FILTER_HERE` such as `/soundbrowser blaze` will show only sounds with by "blaze".

# Questions

If you have any questions, feel free to join the Grakkit community on [Discord](https://discord.gg/dBJffmUzGk) and ask!
