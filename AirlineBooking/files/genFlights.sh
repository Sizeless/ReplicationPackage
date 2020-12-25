#!/bin/bash
export GRAPHQL_URL=$(jq -r '.api[(.api | keys)[0]].output.GraphQLAPIEndpointOutput' ./amplify/#current-cloud-backend/amplify-meta.json)
export COGNITO_USER_POOL_ID=$(jq -r '.auth[(.auth | keys)[0]].output.UserPoolId' ./amplify/#current-cloud-backend/amplify-meta.json)
export COGNITO_USER_POOL_CLIENT_ID=$(jq -r '.auth[(.auth | keys)[0]].output.AppClientIDWeb' ./amplify/#current-cloud-backend/amplify-meta.json)

FLIGHTS="{\"query\": \"$(echo $(tr '\n' ' ' < flights.json) | sed 's/[""]/\\\"/g')\"}"
echo $FLIGHTS >> data.json
expect ./cognitocurl.sh $COGNITO_USER_POOL_ID $COGNITO_USER_POOL_CLIENT_ID $GRAPHQL_URL