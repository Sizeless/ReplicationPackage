#!/bin/sh

export GIT_MERGE_AUTOEDIT=no
git pull
git checkout $EXP_BRANCH
git pull
git merge master --no-edit
git add *
git commit -m "automerge"

# Deploy
npm install
serverless deploy | tee output.txt

# Fix VPC Endpoint
export VPCID=$(aws ec2 describe-vpcs --filter "Name=tag:Name, Values=serverlessvpc" --query 'Vpcs[*].{id:VpcId}' --output text)
export ROUTETABLEID=$(aws ec2 describe-route-tables --filter "Name=vpc-id, Values=${VPCID}" --query 'RouteTables[*].{id:RouteTableId}' --output text)
export VPCENDPOINTID=$(aws ec2 describe-vpc-endpoints --filter "Name=vpc-id, Values=${VPCID}" --query "VpcEndpoints[*].{id:VpcEndpointId}" --output text)
aws ec2 modify-vpc-endpoint --vpc-endpoint-id $VPCENDPOINTID  --add-route-table-ids $ROUTETABLEID

# Collect output
export LINE=$(grep -n "/ingest" output.txt | cut -d: -f1)
export POST=$(sed -n "${LINE}p" < output.txt | cut -b 10-)
export LINE=$(grep -n "/latest" output.txt | cut -d: -f1)
export GET=$(sed -n "${LINE}p" < output.txt | cut -b 9-)
export LINE=$(grep -n "/list" output.txt | cut -d: -f1)
export GET2=$(sed -n "${LINE}p" < output.txt | cut -b 9-)

# Configure load script
sed -i "s@URL1PLACEHOLDER@$POST@g" load.lua
sed -i "s@URL2PLACEHOLDER@$GET@g" load.lua
sed -i "s@URL3PLACEHOLDER@$GET2@g" load.lua

# Run Load
sleep 180
java -jar httploadgenerator.jar loadgenerator > loadlogs.txt 2>&1 &
chmod 777 generateConstantLoad.sh
./generateConstantLoad.sh $EXP_LOAD $EXP_DURATION
sleep 10
java -jar httploadgenerator.jar director --ip localhost --load load.csv -o results.csv --lua load.lua --randomize-users -t $EXP_THREATS

# Collect results
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > eventinserter.csv
aws dynamodb scan --table-name eventinserter --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> eventinserter.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > ingest.csv
aws dynamodb scan --table-name ingest --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> ingest.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > formattemperature.csv
aws dynamodb scan --table-name formattemperature --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> formattemperature.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > formatforecast.csv
aws dynamodb scan --table-name formatforecast --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> formatforecast.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > formatstatechanged.csv
aws dynamodb scan --table-name formatstatechanged --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json | jq -r '.[] | @csv' >> formatstatechanged.csv

# Move results
mkdir -p /results/$EXP_NAME/Repetition_$EXP_REPETITION
mv eventinserter.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/eventinserter.csv
mv ingest.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/ingest.csv
mv formattemperature.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/formattemperature.csv
mv formatforecast.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/formatforecast.csv
mv formatstatechanged.csv /results/$EXP_NAME/Repetition_$EXP_REPETITION/formatstatechanged.csv

# Shutdown
serverless remove
git stash --include-untracked

