Copyright (c) 2021 Thatguyjs All Rights Reserved.

# Pong-Server
An HTTP / WebSocket server for playing Pong in the browser

# Requirements
 - A computer *with* an OS installed
 - Node.js >= 14.0.0
 - A modern-ish browser that supports the HTML5 Canvas and WebSockets

# Setup
 1. Make sure Node.js >= 14.0.0 is installed ([download here](https://nodejs.org/en/download/current/))
 2. Open a terminal window and navigate to `Pong-Server/server`
 3. Run `node index.mjs`
 4. Open a browser window and go to the HTTP address printed by the server

# Server Settings
All server settings are stored in [/server/settings.json](/server/settings.json).
The server has to be restarted to apply any changes.
 - IP / Ports:
   - The HTTP & WebSocket servers can be hosted on any valid IP and port combination
   - Because there are 2 servers being hosted internally (HTTP for static pages, WebSocket for game communication), there are 2 'port' fields in the settings file
 - Keys:
   - The server authentication system works with a key-based system, where keys are generated and replaced once 'stale'
   - There are settings to change the valid duration of a key, as well as how many uses it's allowed
   - A client only has to authenticate once, but may have to re-authenticate if they join again later, after their key has expired
 - Max sessions / games:
   - These settings are used to limit the number of concurrent sessions / games to prevent (some) server overloading
 - IP Bans:
   - Any IP address can be 'banned', which causes any connection from a banned address to be dropped / destroyed
