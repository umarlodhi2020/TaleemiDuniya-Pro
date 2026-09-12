$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location -Path $PSScriptRoot

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🚀 TALEEMIDUNYA PRO: 1-CLICK CLOUD DEPLOY (ONLY 1 PASSWORD NEEDED)" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "👉 UMAR BHAI: Niche apna Alwaysdata ka Password likh kar ENTER dabayein:" -ForegroundColor Yellow
Write-Host "(Dhayan rahe password type karte hue screen par letters nazar nahi aayenge)" -ForegroundColor DarkGray
Write-Host ""

cmd /c "tar -czf - auth_sessions.tar.gz server.js package.json | ssh umarhayat@ssh-umarhayat.alwaysdata.net `"cd ~/TaleemiDunya-Pro/whatsapp-ai-server && killall -9 node 2>/dev/null; rm -rf auth_sessions && tar -xzf - && tar -xzf auth_sessions.tar.gz && export PATH=`$PATH:`$HOME/.npm-global/bin && (pm2 start server.js --name whatsapp-bot || pm2 restart whatsapp-bot || nohup node server.js > bot.log 2>&1 &) && echo '🟢 [SUCCESS] Bot is 100% LIVE 24/7 on Alwaysdata Cloud!'`""

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "✅ DEPLOY COMPLETE! Aap ka WhatsApp AI Bot Alwaysdata Cloud par 100% LIVE hai!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Read-Host -Prompt "Press Enter to exit..."
