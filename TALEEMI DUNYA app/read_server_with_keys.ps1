$hostName = "ssh-umarhayat.alwaysdata.net"
$user = "umarhayat"
$pass = "umar9900"
$remoteFile = "/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js"
$localFile = "G:/taleem dithub/TALEEMI DUNYA app/remote_server.js"

$wshell = New-Object -ComObject WScript.Shell
# Run ssh and redirect output to a local file.
# We use cmd /c to ensure redirection works.
$cmd = "cmd /c ssh -o StrictHostKeyChecking=no ${user}@${hostName} `"cat ${remoteFile}`" > `"${localFile}`""
$wshell.Run($cmd, 1, $false)
Start-Sleep -Seconds 5
$wshell.SendKeys("${pass}{ENTER}")
# Wait for some time for the file to be written
Start-Sleep -Seconds 15
