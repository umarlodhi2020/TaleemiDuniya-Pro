$wshell = New-Object -ComObject WScript.Shell
$wshell.Run("cmd /c ssh -o StrictHostKeyChecking=no umarhayat@ssh-umarhayat.alwaysdata.net "pkill -9 -u umarhayat node; pkill -9 -f server.js"", 1, $false)
Start-Sleep -Seconds 5
$wshell.SendKeys("umar9900{ENTER}")
