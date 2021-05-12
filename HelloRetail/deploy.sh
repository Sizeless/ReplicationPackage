export COMPANY=$3
export TEAM=$4
export REGION=$1
export STAGE=$2
export MEMORY_SIZE=$5
export ACCOUNT_ID=`aws sts get-caller-identity --query Account --output text`
echo $ACCOUNT_ID
npm run root:deploy:all
