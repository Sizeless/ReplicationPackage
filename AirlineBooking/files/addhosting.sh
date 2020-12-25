#!/usr/bin/expect
spawn amplify add hosting
expect HTTPS):
send \n;
expect bucket):
send \b$env(DEPLOYMENT_BUCKET_NAME)\n;
expect html):
send \bindex.html\n;
expect html):
send \bindex.html\n;
interact