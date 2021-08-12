Copyright (c) 2021 Thatguyjs All Rights Reserved.

# Pong-Server
An HTTP / WebSocket server for playing Pong in the browser

# Requirements
 - Node.js >= 14.0.0
 - A computer, *with* an OS installed
 - A modern-ish browser (IE doesn't count)

# Setup
 1. Make sure Node.js >= 14.0.0 is installed ([download here](https://nodejs.org/en/download/current/))
 2. Open a terminal window and navigate to [/server](/server)
 3. Run `node index.mjs`
 4. Open a browser window and go to the first address printed by the server

# Server Settings
All server settings are stored in [/server/settings.json](/server/settings.json).
The server has to be restarted to apply any changes.
 - IP / Ports:
   - Any IP address / port can be chosen to host the server on
   - Because there are 2 servers being hosted internally (HTTP for static pages, WebSocket for game communication), there are 2 'port' fields in the settings file
 - Keys:
   - The server authentication system works with a key-based system, where keys are generated and replaced once 'stale'
   - There are settings to change the valid duration of a key, as well as how many uses it's allowed
   - A client only has to authenticate once, but may have to re-authenticate if they join again later, after their key has expired
 - Max sessions / games:
   - These settings are used to limit the number of concurrent sessions / games to prevent (some) server overloading
 - IP Bans:
   - Any IP address can be 'banned', which means any connection from a banned address will immediately be dropped / destroyed
