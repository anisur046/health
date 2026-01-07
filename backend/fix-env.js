const { execSync } = require('child_process');

const run = (cmd) => {
    try {
        console.log(`Running: ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
        console.log(`Error running ${cmd}: ${e.message}`);
    }
};

run('vercel env rm MYSQL_HOST production -y');
run('vercel env rm MYSQL_USER production -y');
run('vercel env rm MYSQL_PASSWORD production -y');
run('vercel env rm MYSQL_DATABASE production -y');

const add = (key, value) => {
    console.log(`Adding ${key}...`);
    try {
        execSync(`vercel env add ${key} production`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
    } catch (e) {
        console.log(`Error adding ${key}: ${e.message}`);
    }
};

add('MYSQL_HOST', 'sql3.freesqldatabase.com');
add('MYSQL_USER', 'sql3813483');
add('MYSQL_PASSWORD', 'RaNEiSUeb2');
add('MYSQL_DATABASE', 'sql3813483');
