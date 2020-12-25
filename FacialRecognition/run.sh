#!/bin/sh

export GIT_MERGE_AUTOEDIT=no
git pull
git checkout $EXP_BRANCH
git pull
git merge main --no-edit
git add *
git commit -m "automerge"

aws configure set profile produser
aws rekognition create-collection --collection-id rider-photos --region eu-west-1
aws s3 mb s3://wildrydesdeployment
aws s3 mb s3://wild-rydes-sfn-module-us-west-2
aws s3 sync test-images s3://wild-rydes-sfn-module-us-west-2/test-images

cd src/lambda-functions/thumbnail
npm install
cd ../face-detection
npm install
cd ../mock-notification
npm install
cd ../face-search
npm install
cd ../index-face
npm install
cd ../persist-metadata
npm install

cd ../../cloudformation
aws cloudformation package \
     --template-file module-setup.yaml \
     --output-template-file template.packaged.yaml \
     --s3-bucket wildrydesdeployment \
      --s3-prefix ImageProcessing \
		 --profile produser
aws cloudformation deploy --template-file template.packaged.yaml --stack-name wildrydes --capabilities CAPABILITY_IAM --region eu-west-1 --profile produser
cd ../..

# Collect output
APIURL=$(aws cloudformation describe-stacks --stack-name wildrydes --query "Stacks[0].Outputs[5].OutputValue" --output text)
STATEMACHINEARN=$(aws cloudformation describe-stacks --stack-name wildrydes --query "Stacks[0].Outputs[7].OutputValue" --output text)
BUCKETNAME=$(aws cloudformation describe-stacks --stack-name wildrydes --query "Stacks[0].Outputs[8].OutputValue" --output text)

# Prep loadscript
sed -i "s@URLPLACEHOLDER@$APIURL@g" load.lua
sed -i "s@STATEMACHINEARNPLACEHOLDER@$STATEMACHINEARN@g" load.lua
sed -i "s@BUCKETPLACEHOLDER@$BUCKETNAME@g" load.lua

# Run Load
java -jar httploadgenerator.jar loadgenerator > loadlogs.txt 2>&1 &
chmod 777 generateConstantLoad.sh
./generateConstantLoad.sh $EXP_LOAD $EXP_DURATION
sleep 10
java -jar httploadgenerator.jar director --ip localhost --load load.csv -o results.csv --lua load.lua --randomize-users -t $EXP_THREATS

# Collect results
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > facedetection.csv
aws dynamodb scan --table-name long.ma.cancel-booking-metrics --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> facedetection.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > facesearch.csv
aws dynamodb scan --table-name FaceSearchMetrics --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> facesearch.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > notification.csv
aws dynamodb scan --table-name NotificationMetrics --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> notification.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > indexface.csv
aws dynamodb scan --table-name IndexFaceMetrics --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> indexface.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > thumbnail.csv
aws dynamodb scan --table-name ThumbnailMetrics --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> thumbnail.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > persistmetadata.csv
aws dynamodb scan --table-name PersistMetadataMetrics --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> persistmetadata.csv

# Move results
mkdir -p /results/$EXP_NAME/Repetition_$EXP_REPETITION
mv facedetection.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/facedetection.csv
mv facesearch.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/facesearch.csv
mv notification.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/notification.csv
mv indexface.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/indexface.csv
mv thumbnail.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/thumbnail.csv
mv persistmetadata.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/persistmetadata.csv


# Shutdown
aws cloudformation delete-stack --stack-name wildrydes
aws cloudformation wait stack-delete-complete --stack-name wildrydes
aws s3 rm s3://wild-rydes-sfn-module-us-west-2 --recursive
aws s3 rm s3://wildrydesdeployment --recursive
aws rekognition delete-collection --collection-id rider-photos
aws s3 rb s3://wildrydesdeployment
aws s3 rb s3://wild-rydes-sfn-module-us-west-2
git stash --include-untracked

