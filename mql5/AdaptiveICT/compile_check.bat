@echo off
cd /d "D:\FOR RENDO (ONLY )\Personal Project\Dashboard\mql5\AdaptiveICT"
start /wait "" "C:\Program Files\MetaTrader 5\MetaEditor64.exe" /compile:"D:\FOR RENDO (ONLY )\Personal Project\Dashboard\mql5\AdaptiveICT\AdaptiveICT.mq5" /log:"D:\FOR RENDO (ONLY )\Personal Project\Dashboard\mql5\AdaptiveICT\compile_check.log"
echo EXITCODE=%ERRORLEVEL%
