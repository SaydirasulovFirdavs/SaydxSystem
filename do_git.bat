@echo off
cd /d C:\Users\Firdavs\Desktop\nazorat_system_saydx-main
git config user.email "firdavs@saydx.uz"
git config user.name "SAYD.X"
git add -A
git commit -m "Initial commit SAYDX full project"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/otaqulov2222/SAYD.X-SYSTEM.git
git push -u origin main
echo DONE
