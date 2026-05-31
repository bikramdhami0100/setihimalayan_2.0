$assets = "D:\backupfile\setihimalayan_2.0\seti_app\assets"
$res = "D:\backupfile\setihimalayan_2.0\seti_app\android\app\src\main\res"

# Generate padded icons from logo.png
node "D:\backupfile\setihimalayan_2.0\resize-icon.cjs"

# Delete old mipmap icons so they regenerate from assets
Get-ChildItem "$res\mipmap-*\ic_launcher*" -Recurse | Remove-Item -Force

Write-Host "Icons updated with padding. Mipmap cache cleared."
