#!/bin/bash
echo -e "Content-type: text/plain\n"
pkill -9 -u umarhayat node
pkill -9 -f server.js
cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && PORT=8100 nohup node server.js > server.log 2>&1 < /dev/null &
echo "Server started"
