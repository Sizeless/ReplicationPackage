import os
import json

try:
    from urllib2 import HTTPError, build_opener, HTTPHandler, Request
except ImportError:
    from urllib.error import HTTPError
    from urllib.request import build_opener, HTTPHandler, Request


SUCCESS = "SUCCESS"
FAILED = "FAILED"


def send(event, context, response_status, reason=None, response_data=None, physical_resource_id=None):
    response_data = response_data or {}
    response_body = json.dumps(
        {
            'Status': response_status,
            'Reason': reason or "See the details in CloudWatch Log Stream: " + context.log_stream_name,
            'PhysicalResourceId': physical_resource_id or context.log_stream_name,
            'StackId': event['StackId'],
            'RequestId': event['RequestId'],
            'LogicalResourceId': event['LogicalResourceId'],
            'Data': response_data
        }
    )

    opener = build_opener(HTTPHandler)
    request = Request(event['ResponseURL'], data=response_body)
    request.add_header('Content-Type', '')
    request.add_header('Content-Length', len(response_body))
    request.get_method = lambda: 'PUT'
    try:
        response = opener.open(request)
        print("Status code: {}".format(response.getcode()))
        print("Status message: {}".format(response.msg))
        return True
    except HTTPError as exc:
        print("Failed executing HTTP request: {}".format(exc.code))
        return False

import boto3
from botocore.exceptions import ClientError

client = boto3.client('s3')

import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    logger.info("Received event: %s" % json.dumps(event))
    source_bucket = event['ResourceProperties'].get('SourceBucket') or None
    source_prefix = event['ResourceProperties'].get('SourcePrefix') or ''
    bucket = event['ResourceProperties'].get('Bucket') or None
    prefix = event['ResourceProperties'].get('Prefix') or ''
    request_type = event.get('RequestType') or None

    result = "SUCCESS"

    if request_type == None:
        send(event, context, result, {})

    try:
        if request_type == 'Create' or request_type == 'Update':
            result = copy_objects(source_bucket, source_prefix, bucket, prefix)
        elif request_type == 'Delete':
            result = delete_objects(bucket, prefix)
    except ClientError as e:
        logger.error('Error: %s', e)
        result = "FAILED"


    send(event, context, result, {})


def copy_objects(source_bucket, source_prefix, bucket, prefix):
    if source_bucket == None or bucket == None:
        return "SUCCESS"

    paginator = client.get_paginator('list_objects_v2')
    page_iterator = paginator.paginate(Bucket=source_bucket, Prefix=source_prefix)
    try:
        for key in {x['Key'] for page in page_iterator for x in page['Contents']}:
            source_key = key
            dest_key = os.path.join(prefix, os.path.relpath(key, source_prefix))
            print 'copy {} to {}'.format(key, dest_key)
            client.copy_object(CopySource={'Bucket': source_bucket, 'Key': key}, Bucket=bucket, Key=dest_key)
    except KeyError as e:
        logger.error('Error: %s', e)

    return "SUCCESS"


def delete_objects(bucket, prefix):
    if bucket == None:
        return "SUCCESS"

    versioning = client.get_bucket_versioning(Bucket=bucket)
    versioning_status = versioning.get('Status') or 'Disabled'
    if versioning_status == 'Enabled':
        paginator = client.get_paginator('list_object_versions')
        page_iterator = paginator.paginate(Bucket=bucket, Prefix=prefix)
        try: objects = [{'Key': x['Key'],'VersionId': x['VersionId']} for page in page_iterator for x in page['Versions']]
        except KeyError: objects = None

    else:
        paginator = client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket, Prefix=prefix)
        try: objects = [{'Key': x['Key']} for page in page_iterator for x in page['Contents']]
        except KeyError: objects = None

    if objects != None:
        client.delete_objects(Bucket=bucket, Delete={'Objects': objects})

    return "SUCCESS"
