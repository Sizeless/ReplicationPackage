#!/bin/bash
cd src/frontend/
npm install
export VUE_APP_StripePublicKey=${STRIPE_PUBLIC_KEY}
export VUE_APP_PaymentChargeUrl=$(aws ssm get-parameter --name /${AWS_BRANCH}/service/payment/api/charge/url --query 'Parameter.Value' --output text)
npm run build