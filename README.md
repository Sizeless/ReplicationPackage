# Sizeless Replication Package

## Event Processing Case Study
The event processing case study uses the event processing system that was introduced in the paper _Facing the Unplanned Migration of Serverless Applications: A Study on Portability Problems, Solutions, and Dead Ends_ by Yussupov et al. and can be found [here](https://github.com/iaas-splab/faas-migration/tree/master/Event-Processing). In this
paper, the authors investigate the challenges of migrating serverless, FaaS-based applications across cloud providers by migrating different systems across multiple cloud providers. For our case study, we use the AWS implementation of the IoT-inspired event processing system, where the data obtained from multiple sensors are aggregated for further processing.

### System Architecture
<img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/EventProcessing.png?raw=true" width="800">

This system consits of an API Gateway, six Lambda functions, an Aurora database, three SNS topics, and a SQS queue. The API Gateway exposes three endpoints: `/ingest`, `/list`, `/latest`. Any request to `/ingest` triggers the Lambda function _ingest_, which publishes the event to one of the three available SNS topics depending on the event type. This triggers one of the functions _formatTemperature_, _formatForecast_, and _formatStateChanged_, which format/enrich the event and insert it into the SQS queue. Items from this queue are processed by the function _eventInserter_, which writes them to the Aurora database. The API Gateway endpoints `/list` and `/latest` trigger the Lambda functions _list_ and _latest_, which retrieve the ten latest events or all events from the Aurora database, respectively.

### Changelog
We have made the following changes to the original system:
* As with any of the three case studies, we wrapped every function with the resource consumption metrics monitoring and generated a corresponding DynamoDB table for each function where the monitoring data is collected.
* The functions that interact with the Aurora database are within a VPC. We added a DynamoDB VPC Endpoint, so these Lambda functions can connect to the DynamoDB tables containing the metrics.
* Upgraded from nodejs8.10 to nodejs12.X
* Fixed an issue where newer versions of the serverless framework no longer support the following syntax:
    * Old: `- Fn::GetAtt: ServerlessVPC.DefaultSecurityGroup`
    * New: `- Fn::GetAtt: [ServerlessVPC, DefaultSecurityGroup]`


### Workload
For this case study, we configured the following user behavior:
1. Insert a new temperature event
2. Insert a new forecast event
3. Insert a new state change event
4. Retrieve the ten latest events
5. List all events

This sequence of requests ensures that all functions are executed. For our case study, this behavior is traversed concurrently by 24 users at a total rate of 10 requests per second for ten minutes, resulting in at least 1200 executions per function. 


### Replicating our measurements
To replicate our measurements, run the following commands in the folder `EventProcessing`:
```
docker build --build-arg AWS_ACCESS_KEY_ID=YOUR_PUBLIC_KEY --build-arg AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY . -t eventprocessing
docker run -d --name eventprocessing eventprocessing
docker exec -it eventprocessing bash /ReplicationPackage/EventProcessing/runner.sh
```

Make sure to replace `YOUR_PUBLIC_KEY` and`YOUR_SECRET_KEY` with your [AWS Credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html). 

To retrieve the collected monitoring data run the following command:
```
docker cp eventprocessing:/results .
```
If the experiments are still running, this command will retrieve the data for the already finished memory sizes and repetitions.

Measuring the ten repetitions for six different function memory sizes took 2-3 days but was comparatively cheap (<50$) in comparison to the other case studies.
    


## Facial Recognition Case Study
This case study uses the facial recognition/image processing segment of the AWS Wild Rydes Workshop ([Github](https://github.com/aws-samples/aws-serverless-workshops/tree/master/ImageProcessing)), which was also used in the evaluation of the paper _Costless: Optimizing Cost of Serverless Computing through Function Fusion and Placement_ by Elgamal et al.. In this application, users of a fictional transportation app, Wild Rydes, upload their profile picture, which triggers the execution of a workflow that performance facial recogniion, matching, and indexing.

### System Architecture
<img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/imageprocessing.png?raw=true" width="400"><img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/imageprocessing_stepfunctions.png?raw=true" width="400">

This system uses a step functions workflow, six Lambda functions, S3 for thumbnail storage, DynamoDB to store metadata, and AWS Rekognition for facial detection and recognition. Whenever the step functions workflow is executed, the function _FaceDetection_ uses AWS Rekognition to detect any faces in the image. If the photo contains more than one or no face at all, the function _PhotoDoesNotMeetRequirement_ is called, which is a placeholder function for a messaging functionality. Otherwise, the function _CheckFaceDuplicate_ queries the AWS Rekognition collection to check if this face is already registered. If it is already registered, the function _PhotoDoesNotMeetRequirement_ is called, if it is a previously unknown face, then the function _AddFaceToIndex_ uploads the face to the AWS Rekognition collection and the function _Thumbnail_ uses [ImageMagick](https://imagemagick.org/index.php) to create a thumbnail based on the detected image. Finally, the function _Persistmetadata_ saves the image metadata to a DynamoDB table.

### Changelog
We have made the following changes to the original system:
* As with any of the three case studies, we wrapped every function with the resource consumption metrics monitoring and generated a corresponding DynamoDB table for each function where the monitoring data is collected.
* Added an API gateway that triggers the execution of the step functions workflow, which allows us to use a normal HTTP load driver to generate the load.
* Switched the DynamoDB tables from provisioned throughput to pay per request so the system incurrs no costs while not in use.
* Upgraded from nodejs10.x to nodejs12.x
* Fixed an issue where the setup function copyS3object used the cfnresponse package which is not available when using zifiles for the deployment (see [AWS lambda: No module named 'cfnresponse'](https://stackoverflow.com/questions/49885243/aws-lambda-no-module-named-cfnresponse))
* Added a lambda layer containing ImageMagick for the thumbnail function, as this is no longer available in the newer runtimes (see [ImageMagick for AWS Lambda](https://github.com/serverlesspub/imagemagick-aws-lambda-2))
* After looking for the face in the database, the function _CheckFaceDuplicate_ always returns that the image is not yet contained, as otherwise the workload would have to consist of thousands of images that Rekognition recognises as a single face.
* Configured step functions workflow as an express workflow to reduce execution cost

### Workload
For this case study, we configured the following user behavior:
1. Upload valid picture
2. Upload invalid picture

This rather simple sequence of requests already ensures that all functions are executed. For our case study, this behavior is traversed concurrently by 12 users at a total rate of 10 requests per second for five minutes, resulting in at least 1500 executions per function. This case study uses a comparatively short measurement duration and load, as the usage of AWS Rekognition can get quite expensive.

### Replicating our measurements
To replicate our measurements, run the following commands in the folder `FacialRecognition`:
```
docker build --build-arg AWS_ACCESS_KEY_ID=YOUR_PUBLIC_KEY --build-arg AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY . -t facialrecognition
docker run -d --name facialrecognition facialrecognition
docker exec -it facialrecognition bash /ReplicationPackage/FacialRecognition/runner.sh
```

Make sure to replace `YOUR_PUBLIC_KEY` and`YOUR_SECRET_KEY` with your [AWS Credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html). 

To retrieve the collected monitoring data run the following command:
```
docker cp facialrecognition:/results .
```
If the experiments are still running, this command will retrieve the data for the already finished memory sizes and repetitions.

Measuring the ten repetitions for six different function memory sizes took only ~8 hours but was comparatively expensive (~500$) for a load of 10 requests per second.
## Serverless Airline Booking Case Study

### System Architecture
<img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/serverlessairline.png?raw=true" width="800">

### Changelog
We have made the following changes to the original system:
* As with any of the three case studies, we wrapped every function with the resource consumption metrics monitoring and generated a corresponding DynamoDB table for each function where the monitoring data is collected.
* Configured step functions workflow as an express workflow to reduce execution cost
* The Stripe API test mode has a concurrency limit of 25 requests. After contacting the support, we adapted the application to distribute the requests to the StripeAPI across multiple Stripe keys.
* Reconfigured the Stripe integration to timeout and retry long-running requests, which significantly reduced the numberof failed requests.
* We requested an increase of the Lambda concurrent executions service quota from the default of 1.000 to 5.000.
* Implemented caching for SSM parameters to reduce the number of requests to the System Manager Parameter Store.
* Enabled the higher throughput option of the System Manager Parameter Store.

### Workload
For this case study, we configured the following user behavior:
1. Search for a flight
2. Tokenize credit card details using [Stripe](https://stripe.com/)
3. Place a charge on a credit card using [Stripe](https://stripe.com/)
4. Book a flight
5. List booked flights
6. Display loyalty points

This sequence of requests ensures that all functions are executed. For our case study, this behavior is traversed concurrently by 128 users at a total rate of 200 requests per second for ten minutes, resulting in at least 20000 executions per function. 

### Replicating our measurements
To replicate our measurements, run the following commands in the folder `AirlineBooking`:
```
docker build --build-arg AWS_ACCESS_KEY_ID=YOUR_PUBLIC_KEY --build-arg AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY . -t airlinebooking
docker run -d --name airlinebooking airlinebooking
docker exec -it airlinebooking bash /ReplicationPackage/FacialRecognition/runner.sh
```

Make sure to replace `YOUR_PUBLIC_KEY` and`YOUR_SECRET_KEY` with your [AWS Credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html). 

To retrieve the collected monitoring data run the following command:
```
docker cp airlinebooking:/results .
```
If the experiments are still running, this command will retrieve the data for the already finished memory sizes and repetitions.

Measuring the ten repetitions for six different function memory sizes took about a week and incurred costs of ~500$.
