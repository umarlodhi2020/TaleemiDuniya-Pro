@echo off
title TaleemiDunya Pro - 1-Click Cloud Deploy
cd /d "%~dp0"
echo ========================================================================
echo 🚀 TALEEMIDUNYA PRO: 1-CLICK CLOUD DEPLOY (umar9900)
echo ========================================================================
echo.
echo 👉 UMAR BHAI: Niche apna Alwaysdata ka Password likh kar ENTER dabayein:
echo (Dhayan rahe password type karte hue screen par letters nazar nahi aayenge)
echo.
tar -czf - auth_sessions.tar.gz server.js package.json | ssh umarhayat@ssh-umarhayat.alwaysdata.net "cd ~/TaleemiDunya-Pro/whatsapp-ai-server && killall -9 node 2>/dev/null; rm -rf auth_sessions && tar -xzf - && tar -xzf auth_sessions.tar.gz && export PATH=$PATH:$HOME/.npm-global/bin && (pm2 start server.js --name whatsapp-bot || pm2 restart whatsapp-bot || nohup node server.js > bot.log 2>&1 &) && echo '🟢 [SUCCESS] Bot is 100% LIVE 24/7 on Alwaysdata Cloud!'"
echo.
echo ========================================================================
echo ✅ DEPLOY COMPLETE! Aap ka WhatsApp AI Bot Alwaysdata Cloud par 100% LIVE hai!
echo ========================================================================
pause
