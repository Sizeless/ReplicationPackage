#!/bin/bash
set -e
STARTTIME=$(date +%s)

##
# Initialize amplify project
##
echo "# Amplify initialization: Starting..."
IFS='|'
AWSCONFIG="{\
\"configLevel\":\"project\",\
\"useProfile\":true,\
\"profileName\":\"default\",\
\"AmplifyAppId\":\"${AWS_APP_ID}\"\
}"
AMPLIFY="{\
\"envName\":\"dev\",\
\"appId\":\"${AWS_APP_ID}\"\
}"
PROVIDERS="{\
\"awscloudformation\":${AWSCONFIG}\
}"
CODEGEN="{\
\"generateCode\":true,\
\"codeLanguage\":\"javascript\",\
\"fileNamePattern\":\"**/*\",\
\"generatedFileName\":\"API\",\
\"generateDocs\":true\
}"
REACTCONFIG="{\
\"SourceDir\":\"src/frontend\",\
\"DistributionDir\":\"src/frontend/dist\",\
\"BuildCommand\":\"bash ./files/build.sh\",\
\"StartCommand\":\"npm run serve\"\
}"
FRONTEND="{\
\"frontend\":\"javascript\",\
\"framework\":\"react\",\
\"config\":$REACTCONFIG\
}"
amplify init --amplify ${AMPLIFY} --providers ${PROVIDERS} --codegen ${CODEGEN} --yes;
amplify configure project --amplify ${AMPLIFY} --providers ${PROVIDERS} --frontend ${FRONTEND} --yes
echo "# Amplify initialization: Finished!"

##
# Extract Environment data
##
echo "# Environment data extration: Starting..."
export STACK_NAME=$(jq -r '.providers.awscloudformation.StackName' ./amplify/#current-cloud-backend/amplify-meta.json)
export DEPLOYMENT_BUCKET_NAME=$(jq -r '.providers.awscloudformation.DeploymentBucketName' ./amplify/#current-cloud-backend/amplify-meta.json)
export AWS_DEFAULT_REGION=$(jq -r '.providers.awscloudformation.Region' amplify/#current-cloud-backend/amplify-meta.json)
export GRAPHQL_API_ID=$(jq -r '.api[(.api | keys)[0]].output.GraphQLAPIIdOutput' ./amplify/#current-cloud-backend/amplify-meta.json) # TODO
export GRAPHQL_URL=$(jq -r '.api[(.api | keys)[0]].output.GraphQLAPIEndpointOutput' ./amplify/#current-cloud-backend/amplify-meta.json) # TODO
export COGNITO_USER_POOL_ID=$(jq -r '.auth[(.auth | keys)[0]].output.UserPoolId' ./amplify/#current-cloud-backend/amplify-meta.json) # TODO
export COGNITO_USER_POOL_ARN=$(aws cognito-idp describe-user-pool --user-pool-id ${COGNITO_USER_POOL_ID} --query 'UserPool.Arn' --output text)
export COGNITO_USER_POOL_CLIENT_ID=$(jq -r '.auth[(.auth | keys)[0]].output.AppClientIDWeb' ./amplify/#current-cloud-backend/amplify-meta.json) # TODO
aws appsync list-data-sources --api-id ${GRAPHQL_API_ID} > datasources.json
export FLIGHT_TABLE_NAME=$(jq -r '.dataSources[] | select(.name == "FlightTable") | .dynamodbConfig.tableName' datasources.json)
export BOOKING_TABLE_NAME=$(jq -r '.dataSources[] | select(.name == "BookingTable") | .dynamodbConfig.tableName' datasources.json)
export STRIPE_SECRET_KEY=$(cut -d',' -f1 <<<${STRIPE_SECRET_KEYS})
export STRIPE_PUBLIC_KEY=$(cut -d',' -f1 <<<${STRIPE_PUBLIC_KEYS})
echo "# Environment data extration: Finished!"

##
# Export key deployed resources to System Manager Parameter Store
##
echo "# Environment data export: Starting..."
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/deployment/stackName" VALUE=${STACK_NAME}
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/deployment/deploymentBucket" VALUE=${DEPLOYMENT_BUCKET_NAME}
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/auth/userpool/id" VALUE=${COGNITO_USER_POOL_ID}
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/auth/userpool/arn" VALUE=${COGNITO_USER_POOL_ARN}
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/auth/userpool/clientId" VALUE=${COGNITO_USER_POOL_CLIENT_ID}
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/api/id" VALUE=${GRAPHQL_API_ID}
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/api/url" VALUE=${GRAPHQL_URL}
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/storage/table/flight" VALUE=${FLIGHT_TABLE_NAME}
make export.parameter NAME="/${AWS_BRANCH}/service/amplify/storage/table/booking" VALUE=${BOOKING_TABLE_NAME}
make export.parameter NAME="/${AWS_BRANCH}/service/payment/stripe/secretKey" VALUE=${STRIPE_SECRET_KEY}
make export.parameter NAME="/${AWS_BRANCH}/service/payment/stripe/publicKey" VALUE=${STRIPE_PUBLIC_KEY}
make export.parameter NAME="/lambda-stripe-charge/stripe-secret-keys" VALUE=${STRIPE_SECRET_KEYS}
echo "# Environment data export: Finished!"

##
# Deploying SAM based backend
##
echo "# Sam-based backed deployment: Starting..."
make deploy
echo "# Sam-based backed deployment: Finished!"


##
# Add hosting and publish
##
echo "# Frontend deployment: Starting..."
./files/addhosting.sh
amplify publish --yes | tee amplify_publish_logs.txt
echo "# Frontend deployment: Finished!"


##
# Add users to cognito pool
##
echo "# User generation: Starting..."
export userids=""
for i in {1..100}
do
        export res=$((aws cognito-idp sign-up --region us-west-2 --client-id $COGNITO_USER_POOL_CLIENT_ID --username usr$i --password  password --user-attributes Name=email,Value=success+$i@simulator.amazonses.com && aws cognito-idp admin-confirm-sign-up --user-pool-id $COGNITO_USER_POOL_ID --username usr$i) | tail -c 40 |head -c 36)
		export userids+="\""
        export userids+=$res
        export userids+="\""
        export userids+=", "
		sleep 0.2
done
export userids=${userids::-2}
echo $userids
echo "# User generation: Finished!"

##
# Add flights
##
echo "# Flight generation: Starting..."
node files/genflights.js
./files/genFlights.sh
echo "# Flight generation: Finished!"

##
# Parameterizing load script
##
echo "# Loadscript parameterization: Starting..."
export FRONTEND_URL=$(cat ./amplify_publish_logs.txt | grep -o 'https://.*\.amplifyapp\.com')
sed -i "s@GRAPHQL_PLACEHOLDER@$GRAPHQL_URL@g" load/load.lua
export PAYMENT_CHARGE_URL=$(aws ssm get-parameter --name /${AWS_BRANCH}/service/payment/api/charge/url --query 'Parameter.Value' --output text)
sed -i "s@CHARGEURL_PLACEHOLDER@$PAYMENT_CHARGE_URL@g" load/load.lua
export KEYS="\"${STRIPE_PUBLIC_KEYS//,/\",\"}\""
sed -i "s@STRIPE_PUBLIC_KEYS_PLACEHOLDER@$KEYS@g" load/load.lua
sed -i "s@USER_IDS_PLACEHOLDER@$userids@g" load/load.lua
node files/generateCognito.js $COGNITO_USER_POOL_ID $COGNITO_USER_POOL_CLIENT_ID
echo "# Loadscript parameterization: Finished!"

##
# Remove any auxiliary logs
##
echo "# Auxiliary log removal: Starting..."
aws logs describe-log-groups --query 'logGroups[*].logGroupName' --output table | awk '{print $2}' | grep -v ^$ | while read x; do if [ "$x" != "DescribeLogGroups" ]; then echo "deleting $x" ; aws logs delete-log-group --log-group-name $x; fi done
echo "# Auxiliary log removal: Finished!"

##
# Timer
##
ENDTIME=$(date +%s)
echo "It took $(($ENDTIME - $STARTTIME)) seconds to deploy the serverless airline"

##
# Run experiment
##
cd load
echo "# Experiment: Starting..."
java -jar httploadgenerator.jar loadgenerator > loadlogs.txt 2>&1 &
./generateConstantLoad.sh $EXP_LOAD $EXP_DURATION
sleep 10
java -jar httploadgenerator.jar director --ip localhost --load load.csv -o results.csv --lua load.lua --randomize-users -t $EXP_THREATS
cd ..
echo "# Experiment: Finished!"

##
# Collect logs
echo "# Log collection: Starting..."
mkdir -p results/$EXP_NAME/Repetition_$EXP_REPETITION
mv load/timestamps.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/timestamps.csv
mv load/results.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/results.csv
mv load/loadlogs.txt results/$EXP_NAME/Repetition_$EXP_REPETITION/loadlogs.txt
./files/fetchEvalMetrics
mv long.ma.loyalty-get-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.loyalty-get-metrics.csv
mv long.ma.reserve-booking-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.reserve-booking-metrics.csv
mv long.ma.notify-booking-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.notify-booking-metrics.csv
mv long.ma.confirm-booking-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.confirm-booking-metrics.csv
mv long.ma.capture-stripe-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.capture-stripe-metrics.csv
mv long.ma.charge-stripe-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.charge-stripe-metrics.csv
mv long.ma.collect-payment-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.collect-payment-metrics.csv
mv long.ma.loyalty-ingest-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.loyalty-ingest-metrics.csv
mv long.ma.cancel-booking-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.cancel-booking-metrics.csv
mv long.ma.refund-payment-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.refund-payment-metrics.csv
mv long.ma.refund-stripe-metrics.csv results/$EXP_NAME/Repetition_$EXP_REPETITION/long.ma.refund-stripe-metrics.csv

sleep 1500
awslogs groups | awk '{print $1}' | grep -v ^$ | while read x; do echo "Collecting logs for $x"; awslogs get $x ALL -s1d --timestamp --filter-pattern="[r=REPORT,...]" >> results/$EXP_NAME/Repetition_$EXP_REPETITION/${x/\/aws\/lambda\/}.txt; done
awslogs groups | awk '{print $1}' | grep -v ^$ | while read x; do echo "1/2 Collecting warmup logs for $x"; awslogs get $x ALL -s1d --timestamp --filter-pattern="[a,b,c,r=COLDSTART,...]" >> results/$EXP_NAME/Repetition_$EXP_REPETITION/${x/\/aws\/lambda\/}_coldstarts.txt; done
awslogs groups | awk '{print $1}' | grep -v ^$ | while read x; do echo "2/2 Collecting warmup logs for $x"; awslogs get $x ALL -s1d --timestamp --filter-pattern="[r=COLDSTART,...]" >> results/$EXP_NAME/Repetition_$EXP_REPETITION/${x/\/aws\/lambda\/}_coldstarts.txt; done
echo "# Log collection: Finished!"

##
# Wait until shutdow
##
#echo "Press any key to shut the application down"
#read -n 1 -s

##
# Shutdown
##
echo "# Shutdown: Starting..."
aws cloudformation delete-stack --stack-name api-lambda-stripe-charge
export AWS_BRANCH="develop"
export STACK_NAME=$(aws ssm get-parameter --name /${AWS_BRANCH}/service/amplify/deployment/stackName --query 'Parameter.Value' --output text)
make delete
aws cloudformation delete-stack --stack-name api-lambda-stripe-charge
echo "Yes\n" | amplify delete
set +e
aws s3 ls | cut -d" " -f 3 | grep -v exp-results | xargs -I{} aws s3 rb s3://{} --force
set -e
aws cloudformation delete-stack --stack-name api-lambda-stripe-charge
pkill -f 'java -jar'
pkill -f 'java -jar'

rm amplify_publish_logs.txt
rm data.json
rm datasources.json
rm flights.json

echo "# Shutdown: Finished!"
