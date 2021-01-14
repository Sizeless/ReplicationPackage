# Sizeless Replication Package
The replication package for our paper _Sizeless: Predicting the optimal size of serverless functions_ consists of five parts:
* [Automated measurement harness for the airline booking case study](#Airline-Booking-Case-Study)
* [Automated measurement harness for the event processing case study](#Event-Processing-Case-Study)
* [Automated measurement harness for the facial recognition case study](#Facial-Recognition-Case-Study)
* [Synthetic function generator used to generate our training dataset](#Synthetic-Function-Generator)
* [Collected measurement data and analysis scripts required to reproduce all results/figures from the paper](#Measurement-data-and-analysis-scripts)

## Airline Booking Case Study
The Airline Booking application is a fully serverless web application that implements the flight booking aspect of an airline on AWS ([GitHub](https://github.com/aws-samples/aws-serverless-airline-booking)). Customers can search for flights, book flights, pay using a credit card, and earn loyalty points with each booking. The airline booking applicaion was the subject of the [AWS Build On Serverless](https://pages.awscloud.com/GLOBAL-devstrategy-OE-BuildOnServerless-2019-reg-event.html) series and presented inthe AWS re:Invent session [Production-grade full-stack apps with AWS Amplify](https://www.youtube.com/watch?v=DcrtvgaVdCU).

### System Architecture
The frontend of the serverless airline is implemented using CloudFront, Amplify/S3, Vue.js, the Quasar framework, and stripe elements. 
This frontend sends queries to five backend APIs: _Search Flights_, _Create Charge_, _Create Booking_, _List Bookings_, and _Get Loyalty_. The five APIs are implemented as GraphQL queries using AWS AppSync, a managed GraphQL service. 
<p align="center">
<img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/serverlessairline.png?raw=true" width="800">
</p>

The _Search Flights_ API retrieves all flights for a given date, arrival airport and departure airport from a DynamoDB table using the DynamoDB GraphQL resolver. 
The _Create Charge_ API executes the _ChargeCard_ Lambda function, which wraps a call to the Stripe API. 
The _Create Booking_ API executes a step function workflow that reserves a seat on a flight, creates an unconfirmed booking, and attempts to collect the charge on the customer's credit card. This workflow includes the functions _ReserveBooking_, _CollectPayment_, _ConfirmBooking_, and _NotifyBooking_, which edit DynamoDB tables, manage calls to Stripe, and push a message to an SNS topic. The _IngestLoyalty_ function reads from this SNS topic to update the loyalty points in a DynamoDB table. Whenen the _Get Loyalty_ API is called, the function _GetLoyalty_ retrieves the relevant loyalty data from this DynamoDB table.

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

## Event Processing Case Study
The event processing case study uses the event processing system that was introduced in the paper _Facing the Unplanned Migration of Serverless Applications: A Study on Portability Problems, Solutions, and Dead Ends_ by Yussupov et al. and can be found [here](https://github.com/iaas-splab/faas-migration/tree/master/Event-Processing). In this
paper, the authors investigate the challenges of migrating serverless, FaaS-based applications across cloud providers by migrating different systems across multiple cloud providers. For our case study, we use the AWS implementation of the IoT-inspired event processing system, where the data obtained from multiple sensors are aggregated for further processing.

### System Architecture
<p align="center">
<img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/EventProcessing.png?raw=true" width="800">
</p>

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
<p align="center">
<img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/imageprocessing.png?raw=true" width="400"><img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/imageprocessing_stepfunctions.png?raw=true" width="400">
</p>

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
* Configured step functions workflow as an express workflow to reduce execution cost.
* Excluded the function _PhotoDoesNotMeetRequirement_ from evaluation as it is a no-op stub.

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

Measuring the ten repetitions for six different function memory sizes took only ~8 hours but was comparatively expensive (~400$) for a load of 10 requests per second.

## Synthetic Function Generator
This is the Synthetic function generator from the manuscript "Sizeless: Predicting the optimal size of serverless functions". It generates AWS Lambda deployable functions by randomly combining commonly occurring function segments. The generated functions are instrumented with a resource consumption monitoring functionality. Besides the generation it also provides the possibility to directly benchmark the resulting functions. Overall, it allows the generation and benchmarking of an almost arbirarily large number of serverless functions.

### Resource consumption monitoring



### Setup
In order to install and configure the synthetic function generator, the following steps are required:

* Install the required dependencies:
   * Install `golang` (tested for versions 1.14+)
   * Install `nodejs` (tested for versions 12.0+)
   * Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
   * Install the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Build the synthetic function generator CLI: Inside the `function-generator` directory run the command `go build .`. By default this results in a file named `synthetic-function-generator`.
* Both the AWS CLI and SAM CLI read the AWS Credentials that are needed to perform actions on AWS from either environment variables or by convention from a file in `$HOME/.aws/credentials`. Make sure that a valid **Access Key** and **Secret Key** can be found by both CLIs. See the [official documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) for more details on configuring the AWS CLI.
* The monitoring add-on has some dependencies on certain npm packages.
To avoid that each synthetic function package has to bring these dependencies, the use of a dependency layer proved to be the most efficient way.
The file `dependencyLayer.zip` represents a ready-to-deploy package to add the required dependencies as a Lambda Layer. Follow the instructions on `AWS Console -> Lambda -> Additional resources -> Layers` to deploy the package. The dependency layer will be assigned a **Version ARN**, which is needed to generate functions using the CLI.
For more information about AWS Lambda Layers, see [here](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html).
* The synthetic Lambda functions need to be assigned a role ARN to allow the function to access other AWS services. Either create a new role that defines what services the Lambda functions are allowed to access or use an existing role. Make sure that AWS Lambda is listed in the **Trusted Entities** section so that it can be used by Lambda. To generate synthetic functions using the CLI the **Role ARN** will be needed.

### Using the synthetic function generator
The CLI of the synthetic function generator offers the commands `generate`, `runload`, and `clean', which are described in the following.

#### Command `generate`

```
This command generates AWS Lambda deployable serverless function artifacts.
The generated artifacts are compatible for use with the runload command.

Usage:
  synthetic-function-generator generate [flags]

Flags:
  -d, --dependency-layern-arn string   The ARN of the dependency layer, see README (required)
      --exclude string                 Path to file containing roll strings to be excluded from generation (use --save flag for an example)
  -f, --func-segments string           Path to function segments to be used for generation (required)
  -h, --help                           help for generate
  -l, --lambda-role-arn string         The ARN of the lambda role, see README (required)
  -m, --max-roll int                   Maximum number of rolled function segments (ignored if replayFile is provided) (default 3)
  -n, --num-funcs int                  Number of functions to generate (ignored if replayFile is provided) (default 1)
      --replay string                  Path to file containing roll strings to be regenerated (use --save flag for an example)
      --save                           Whether the generated function combinations should be saved
  -s, --sizes ints                     Specify function sizes to be generated, need to be supported by the platform! (default [128,416,704,992,1280,1568,1856,2144,2432,2720,3008])
```

#### Command `runload`

```
This command drives load on the generated functions on lambda.
It writes the results on the local filesystem specified by the flag --result-dir for later evaluation.

Usage:
  synthetic-function-generator runload [flags]

Flags:
  -d, --duration int        Target duration in seconds (default 10)
  -f, --func-dir string     Directory containing the lambda functions (required)
  -h, --help                help for runload
  -p, --req-per-sec int     Target requests per second (default 50)
  -r, --result-dir string   Directory for the measurement results (default "./result-data")
  -w, --workers int         Number of parallel workers (default 5)
```

#### Command `clean`

```
This command can be used to delete all generated functions

Usage:
  synthetic-function-generator clean [flags]

Flags:
  -h, --help   help for clean
```

### Replicating our measurements
To replicate the generation of our training data set, run the following commands:

```
synthetic-function-generator generate --dependency-layern-arn LAYER_ARN --func-segments ../function_segments --lambda-role-arn LAMBDA_ROLE_ARN --replay ../replay.txt -s 128,256,512,1024,2048,3008
synthetic-function-generator runload --duration 600 --req-per-sec 30 
synthetic-function-generator clean
```

Make sure to replace `LAYER_ARN` and `LAMBDA_ROLE_ARN` with the corresponding ARNs from the setup step. The results are saved to the folder `./result-data`.

Generating this training data set of resource consumption metrics and execution duration of 2000 functions at six different memory levels took ~2 weeks and incurred costs of ~2000$.

## Measurement data and analysis scripts
TODO describe codeocean capsule
