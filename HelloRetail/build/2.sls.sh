#!/bin/sh -u

# begin debug
export SLS_DEBUG=*
# end debug

echo
echo ${1} ${2} in ${3}

OWD=$(pwd)

cd ${3}
RES=$?
if [ ${RES} -eq 0 ]; then
  ${OWD}/node_modules/.bin/sls ${1} -s ${STAGE} -v
  RES=$?
  cd ${OWD}
  exit ${RES}
else
  exit ${RES}
fi
