# Name
### {{module_name}}
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon

# Synopsis
{{synopsis}}

# Description

# Example

# Install:
`npm install {{module_name}}`

# Test:
`npm test`

#License:
{{license}}

#commad to generate a android app
 cd D:\backupfile\setihimalayan_2.0\seti_app\android
>> .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon