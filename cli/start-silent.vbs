' Unlimited Router — silent launcher (mode tray).
' wscript.exe runs this from the registry Run key; node.exe opens with
' a HIDDEN window (style 0), so no console flash at Windows startup.

Dim shell, fso, nodeExe, cliJs, workDir

Set fso = CreateObject("Scripting.FileSystemObject")
workDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\9router-npm-global"

nodeExe = "C:\Program Files\nodejs\node.exe"
If Not fso.FileExists(nodeExe) Then nodeExe = "node.exe"

cliJs = """" & workDir & "\cli.js"""

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = workDir
' 0 = hidden window, False = don't wait for process to finish
shell.Run """" & nodeExe & """ " & cliJs & " --tray --no-browser --skip-update --host 127.0.0.1 --port 20128", 0, False
Set shell = Nothing
Set fso = Nothing
