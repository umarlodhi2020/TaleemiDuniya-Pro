$archivePath = Join-Path $PSScriptRoot "auth_sessions.tar.gz"
$serverPath = Join-Path $PSScriptRoot "server.js"
$packagePath = Join-Path $PSScriptRoot "package.json"
$remoteUser = "umarhayat"
$remoteHost = "ssh-umarhayat.alwaysdata.net"
$remotePath = "~/TaleemiDunya-Pro/whatsapp-ai-server/"

Write-Host "Uploading auth_sessions, server.js, and package.json to Alwaysdata..."
scp $archivePath $serverPath $packagePath "${remoteUser}@${remoteHost}:${remotePath}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Upload successful. Extracting clean archive and starting bot on Cloud..."
    ssh ${remoteUser}@${remoteHost} "cd $remotePath && killall -9 node 2>/dev/null; rm -rf auth_sessions && tar -xzf auth_sessions.tar.gz && export PATH=\$PATH:\$HOME/.npm-global/bin && (pm2 start server.js --name whatsapp-bot || pm2 restart whatsapp-bot || nohup node server.js > bot.log 2>&1 &) && echo '🟢 Cloud Server Started Successfully!'"
} else {
    Write-Error "Upload failed. Please check your password and network."
}
