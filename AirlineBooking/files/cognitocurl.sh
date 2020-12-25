#!/usr/bin/expect

set user [lindex $argv 0]
set client [lindex $argv 1]
set gql [lindex $argv 2]

spawn cognitocurl --cognitoclient $client --userpool $user --run "curl -i -H 'Content-Type: application/json' -X POST -d @'data.json' $gql"
expect 'Username:':
send usr1\n;
expect 'Password:':
send password\n;
interact