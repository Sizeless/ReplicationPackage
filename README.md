# Sizeless Replication Package

## Event Processing Case Study
The event processing case study uses the event processing system that was introduced in the paper _Facing the Unplanned Migration of Serverless Applications: A Study on Portability Problems, Solutions, and Dead Ends_ by Yussupov et. al. and can be found [here](https://github.com/iaas-splab/faas-migration/tree/master/Event-Processing). In this
paper, the authors investigate the challenges of migrating serverless, FaaS-based applications across cloud providers, by migrating different systems across multiple cloud providers. For our case study, we use the AWS implementation of the IoT-inspired event processing system, where the data obtained from multiple sensors are aggregated for further processing.

### System Architecture
<img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/EventProcessing.png?raw=true" width="800">

This system consits of an API Gateway, six Lambda functions, an Aurora database, three SNS topics, and a SQS queue. The API Gateway exposes three endpoints: `/ingest`, `/list`, `/latest`. Any request to `/ingest` triggers the Lambda function _ingest_, which publishes the event to one of the three available SNS topics depending on the event type. This triggers on of the functions _formatTemperature_, _formatForecast_, _formatStateChanged_ which format/enrich the event and insert it into the SQS queue. Items from this queue are processed by the function _eventInserter_, which writes them to the Aurora database. The API Gateway endpoints `/list` and `/latest` trigger the Lambda functions _list_ and _latest_, which retrieve the ten latest events or all events from the Aurora database, respectively.

### Changelog
We have made the following changes to the original system:
* As with any of the three case studies, we wrapped every function with the resource consumption metrics monitoring and generated a corresponding DynamoDB table for each funcion where the monitoring data is collected.
* The functions that interact with the Aurora database are within a VPC. We added a DynamoDB VPC Endpoint, so these Lambda functions can connect to the DynamoDB tables containing the metrics.
* Upgraded from nodejs8.10 to nodejs12.X
* Fixed an issue where newer versions of the serverless framework no longer support the following syntax:
    * Old: `- Fn::GetAtt: ServerlessVPC.DefaultSecurityGroup`
    * New: `- Fn::GetAtt: [ServerlessVPC, DefaultSecurityGroup]`


### Workload

### Replicating our measurements

## WildRydes Case Study

## Serverless Airline Booking Case Study
