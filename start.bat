@echo off
chcp 65001 >nul
title AAAI 桌面

cd /d "%~dp0"

if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
)

echo.
echo 启动中...
echo.
call npm start

pause
