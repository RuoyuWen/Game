@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo 正在启动服务器，请稍候...
echo 此窗口请保持运行，关闭即停止服务器。
echo.
node server.js
echo.
echo 服务器已停止。
pause
