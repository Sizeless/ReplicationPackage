#!/bin/sh

DOMAIN=hello-retail.biz
STAGE=$1

if [ -z "$STAGE" ]; then
  echo usage: deploy stage
  exit 1
else
  if [ $STAGE = "prod" ]; then
    STAGE=
  else
    STAGE=$STAGE.
  fi

  BUCKET_NAME=$STAGE$DOMAIN

  echo Copying app files to S3 bucket $BUCKET_NAME...

  aws s3 cp ./app/app.css s3://$BUCKET_NAME/
  aws s3 cp ./app/bundle.js s3://$BUCKET_NAME/
  aws s3 cp ./app/index.html s3://$BUCKET_NAME/

  echo Bucket $BUCKET_NAME deployment complete.
fi

