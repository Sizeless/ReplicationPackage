#!/usr/bin/expect
spawn amplify hosting add
expect "deployment)\r"
send -- "\r"
expect "Manual deployment\r"
send -- "\r"
expect eof
#expect html):
#send \bindex.html\n;
#expect html):
#send \bindex.html\n;
# interact
