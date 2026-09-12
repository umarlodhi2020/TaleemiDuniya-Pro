$wshell = New-Object -ComObject WScript.Shell

# 1. Find line number
$cmd1 = 'ssh -o StrictHostKeyChecking=no umarhayat@ssh-umarhayat.alwaysdata.net "grep -n \"request-otp\" /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js" > grep_out.txt'
Write-Host "Running: $cmd1"
$wshell.Run("cmd /c $cmd1", 1, $false)
Sleep 2
$wshell.SendKeys("umar9900{ENTER}")
Sleep 5

if (Test-Path "grep_out.txt") {
    $grepOut = Get-Content "grep_out.txt" -Raw
    Write-Host "Grep Output: $grepOut"
    if ($grepOut -match '^(\d+):') {
        $lineNum = [int]$matches[1]
        $start = [Math]::Max(1, $lineNum - 10)
        $end = $lineNum + 100

        # 2. Read lines
        $cmd2 = "ssh -o StrictHostKeyChecking=no umarhayat@ssh-umarhayat.alwaysdata.net `"sed -n '$start,${end}p' /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`" > snippet_out.txt"
        Write-Host "Running: $cmd2"
        $wshell.Run("cmd /c $cmd2", 1, $false)
        Sleep 2
        $wshell.SendKeys("umar9900{ENTER}")
        Sleep 8
    } else {
        Write-Host "Could not find line number in grep_out.txt"
    }
} else {
    Write-Host "grep_out.txt not found"
}
