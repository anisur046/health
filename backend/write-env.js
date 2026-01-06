const fs = require('fs');
const content = `MONGODB_URI=mongodb://localhost:27017/health
PORT=3001
MYSQL_HOST=sql3.freesqldatabase.com
MYSQL_USER=sql3813483
MYSQL_PASSWORD=RaNEiSUeb2
MYSQL_DATABASE=sql3813483
`;
fs.writeFileSync('.env', content);
console.log('.env written');
