#!/bin/sh

cd /hello-retail

# Deploy serverless infrastructure
./deploy.sh ${EXP_REGION} prod company team ${EXP_MEMORY_SIZE} | tee deployment.log

# Collect output
URL_API_EVENT_WRITER=$(cat deployment.log | grep -oP --max-count=1 'https://[-\w.]+/\w+/event-writer')
URL_API_PRODUCT_CATALOG_CATEGORIES=$(cat deployment.log | grep -oP --max-count=1 'https://[-\w.]+/\w+/categories')
URL_API_PRODUCT_CATALOG_PRODUCTS=$(cat deployment.log | grep -oP --max-count=1 'https://[-\w.]+/\w+/products')
URL_API_PHOTO_RECEIVE=$(cat deployment.log | grep -oP --max-count=1 'https://[-\w.]+/\w+/sms')
echo "Event Writer API: ${URL_API_EVENT_WRITER}"
echo "Product Catalog Categories API: ${URL_API_PRODUCT_CATALOG_CATEGORIES}"
echo "Product Catalog Products API: ${URL_API_PRODUCT_CATALOG_PRODUCTS}"
echo "Photo Receive API: ${URL_API_PHOTO_RECEIVE}"

# Prep loadscript
cp load.lua load_backup.lua
sed -i "s@URLAPIEVENTWRITERPLACEHOLDER@${URL_API_EVENT_WRITER}@g" load.lua
sed -i "s@URLAPIPRODUCTCATALOGCATEGORIESPLACEHOLDER@${URL_API_PRODUCT_CATALOG_CATEGORIES}@g" load.lua
sed -i "s@URLAPIPRODUCTCATALOGPRODUCTSPLACEHOLDER@${URL_API_PRODUCT_CATALOG_PRODUCTS}@g" load.lua
sed -i "s@URLAPIPHOTORECEIVEPLACEHOLDER@${URL_API_PHOTO_RECEIVE}@g" load.lua

# Run Load
java -jar httploadgenerator.jar loadgenerator > loadlogs.txt 2>&1 &
./generateConstantLoad.sh ${EXP_LOAD} ${EXP_DURATION}
sleep 10
java -jar httploadgenerator.jar director --ip localhost --load load.csv -o results.csv --lua load.lua -t ${EXP_THREATS}

# Collect results
sleep 30  # wait for dynamodb to settle before downloading data
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > event-writer.csv
aws dynamodb scan --table-name metrics.event-writer --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> event-writer.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > product-catalog-api.csv
aws dynamodb scan --table-name metrics.product-catalog-api --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> product-catalog-api.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > product-catalog-builder.csv
aws dynamodb scan --table-name metrics.product-catalog-builder --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> product-catalog-builder.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > photo-processor.csv
aws dynamodb scan --table-name metrics.photo-processor --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> photo-processor.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > photo-assign.csv
aws dynamodb scan --table-name metrics.photo-assign --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> photo-assign.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > photo-receive.csv
aws dynamodb scan --table-name metrics.photo-receive --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> photo-receive.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > photo-fail.csv
aws dynamodb scan --table-name metrics.photo-fail --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> photo-fail.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > photo-success.csv
aws dynamodb scan --table-name metrics.photo-success --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> photo-success.csv
echo "duration,maxRss,fsRead,fsWrite,vContextSwitches,ivContextSwitches,userDiff,sysDiff,rss,heapTotal,heapUsed,external,elMin,elMax,elMean,elStd,bytecodeMetadataSize,heapPhysical,heapAvailable,heapLimit,mallocMem,netByRx,netPkgRx,netByTx,netPkgTx" > photo-report.csv
aws dynamodb scan --table-name metrics.photo-report --query "Items[*].[duration.N,maxRss.N,fsRead.N,fsWrite.N,vContextSwitches.N,ivContextSwitches.N,userDiff.N,sysDiff.N,rss.N,heapTotal.N,heapUsed.N,external.N,elMin.N,elMax.N,elMean.N,elStd.N,bytecodeMetadataSize.N,heapPhysical.N,heapAvailable.N,heapLimit.N,mallocMem.N,netByRx.N,netPkgRx.N,netByTx.N,netPkgTx.N]" --output json --region ${EXP_REGION} | jq -r '.[] | @csv' >> photo-report.csv

# Move results
mkdir -p /results/${EXP_NAME}/Repetition_${EXP_REPETITION}
mv event-writer.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/event-writer.csv
mv product-catalog-api.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/product-catalog-api.csv
mv product-catalog-builder.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/product-catalog-builder.csv
mv photo-processor.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/photo-processor.csv
mv photo-assign.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/photo-assign.csv
mv photo-receive.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/photo-receive.csv
mv photo-fail.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/photo-fail.csv
mv photo-success.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/photo-success.csv
mv photo-report.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/photo-report.csv
mv results.csv /results/${EXP_NAME}/Repetition_${EXP_REPETITION}/loadgenerator-results.csv

# Shutdown
cp load_backup.lua load.lua
./remove.sh ${EXP_REGION} prod company team
