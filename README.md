# Sizeless Replication Package

## Event Processing Case Study
The event processing case study uses the event processing system that was introduced in the paper _Facing the Unplanned Migration of Serverless Applications: A Study on Portability Problems, Solutions, and Dead Ends_ by Yussupov et. al. and can be found [here](https://github.com/iaas-splab/faas-migration/tree/master/Event-Processing). In this
paper, the authors investigate the challenges of migrating serverless, FaaS-based applications across cloud providers, by migrating different systems across multiple cloud providers. For our case study, we use the AWS implementation of the IoT-inspired event processing system, where the data obtained from multiple sensors are aggregated for further processing.

### System Architecture
<img src="https://github.com/Sizeless/ReplicationPackage/blob/main/images/EventProcessing.png?raw=true" width="800">
This system consits of an API Gateway, six Lambda functions, an Aurora database, three SNS topics, and a SQS queue.

### Changelog

### Workload

### Replicating our measurements

## WildRydes Case Study

## Serverless Airline Booking Case Study
