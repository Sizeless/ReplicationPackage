#!/bin/sh -u

echo $1 in $2

OWD=$(pwd)

cd ${2}
RES=$?
if [ ${RES} -eq 0 ]; then
  npm install
  RES=$?
  if [ ${RES} -ne 0 ]; then
    tail -n 100 npm-debug.log
  fi
  cd ${OWD}
  exit ${RES}
else
  exit ${RES}
fi
