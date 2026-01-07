Write-Output "Fixing Env Vars..."
vercel env rm MYSQL_HOST production -y
vercel env rm MYSQL_USER production -y
vercel env rm MYSQL_PASSWORD production -y
vercel env rm MYSQL_DATABASE production -y

Write-Output "sql3.freesqldatabase.com" -NoNewline | vercel env add MYSQL_HOST production
Write-Output "sql3813483" -NoNewline | vercel env add MYSQL_USER production
Write-Output "RaNEiSUeb2" -NoNewline | vercel env add MYSQL_PASSWORD production
Write-Output "sql3813483" -NoNewline | vercel env add MYSQL_DATABASE production
Write-Output "Done."
