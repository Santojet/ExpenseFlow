Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' 1. Start Backend silently
WshShell.Run "cmd /c cd /d """ & strPath & "\backend"" && python run.py", 0, False

' 2. Start Frontend silently
WshShell.Run "cmd /c cd /d """ & strPath & "\frontend"" && npm run dev", 0, False

' 3. Start Cloudflare Tunnel silently
WshShell.Run "cmd /c """ & strPath & "\cloudflared.exe"" tunnel --url http://localhost:5173", 0, False

' 4. Wait 3.5 seconds and open localhost in browser
WScript.Sleep 3500
WshShell.Run "http://localhost:5173"
