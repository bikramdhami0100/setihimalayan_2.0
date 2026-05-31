$assets = "D:\backupfile\setihimalayan_2.0\seti_app\assets"
$res = "D:\backupfile\setihimalayan_2.0\seti_app\android\app\src\main\res"

# Copy logo.png as all icon types
Copy-Item "$assets\logo.png" "$assets\icon.png" -Force
Copy-Item "$assets\logo.png" "$assets\adaptive-icon.png" -Force
Copy-Item "$assets\logo.png" "$assets\splash-icon.png" -Force

# Delete old mipmap icons so they regenerate from assets
Get-ChildItem "$res\mipmap-*\ic_launcher*" -Recurse | Remove-Item -Force

Write-Host "Icons updated. Mipmap cache cleared."
