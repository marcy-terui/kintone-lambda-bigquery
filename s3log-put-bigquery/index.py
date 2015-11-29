import os
import json
import urllib
import boto3
import re
import datetime
import pytz
from gcloud import bigquery

BQ_PROJECT = 'kintone-bigquery-sample'
BQ_DATASET = 's3log'
BQ_TABLE = 'oldblog'

s3 = boto3.client('s3')
bq = bigquery.Client.from_service_account_json(
    os.path.join(os.path.dirname(__file__), 'bq.json'),
    project=BQ_PROJECT)
dataset = bq.dataset(BQ_DATASET)
table = dataset.table(name=BQ_TABLE)
table.reload()

pattern = ' '.join([
    '^(?P<owner>[^ ]+)',
    '(?P<bucket>[^ ]+)',
    '\[(?P<datetime>.+)\]',
    '(?P<remote_ip>[^ ]+)',
    '(?P<requester>[^ ]+)',
    '(?P<request_id>[^ ]+)',
    '(?P<operation>[^ ]+)',
    '(?P<key>[^ ]+)',
    '"(?P<method>[^ ]+) (?P<uri>[^ ]+) (?P<proto>.+)"',
    '(?P<status>[^ ]+)',
    '(?P<error>[^ ]+)',
    '(?P<bytes>[^ ]+)',
    '(?P<size>[^ ]+)',
    '(?P<total_time>[^ ]+)',
    '(?P<ta_time>[^ ]+)',
    '"(?P<referrer>.+)"',
    '"(?P<user_agent>.+)"',
    '(?P<version>.+)$'])
log_pattern = re.compile(pattern)

def to_int(val):
    try:
        ret = int(val)
    except ValueError:
        ret = None
    return ret

def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.unquote_plus(event['Records'][0]['s3']['object']['key']).decode('utf8')
    res = s3.get_object(Bucket=bucket, Key=key)
    body = res['Body'].read()
    rows = []

    for line in body.splitlines():
        matches = log_pattern.match(line)
        dt_str = matches.group('datetime').split(' ')[0]
        timestamp = datetime.datetime.strptime(
            dt_str, '%d/%b/%Y:%H:%M:%S').replace(tzinfo=pytz.utc)

        rows.append((
            matches.group('owner'),
            matches.group('bucket'),
            timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            matches.group('remote_ip'),
            matches.group('requester'),
            matches.group('request_id'),
            matches.group('operation'),
            matches.group('key'),
            matches.group('method'),
            matches.group('uri'),
            matches.group('proto'),
            matches.group('status'),
            matches.group('error'),
            to_int(matches.group('bytes')),
            to_int(matches.group('size')),
            to_int(matches.group('total_time')),
            to_int(matches.group('ta_time')),
            matches.group('referrer'),
            matches.group('user_agent'),
            matches.group('version'),))
    print(table.insert_data(rows))
