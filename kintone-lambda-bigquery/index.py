import os
from gcloud import bigquery


def lambda_handler(event, context):
    client = bigquery.Client.from_service_account_json(
        os.path.join(os.path.dirname(__file__), 'bq.json'),
        project='kintone-bigquery-sample')
    query = """
SELECT
    COUNT(*) AS count,
    IFNULL(SUM(bytes), 0) AS total_size,
    IFNULL(AVG(total_time), 0) AS avg_time
FROM [s3log.oldblog]
WHERE
  TIMESTAMP_TO_SEC(TIMESTAMP(datetime))
  BETWEEN
    TIMESTAMP_TO_SEC(TIMESTAMP('{f}'))
  AND
    TIMESTAMP_TO_SEC(TIMESTAMP('{t}'))
""".format(f=event.get('from'), t=event.get('to'))
    results = client.run_sync_query(query)
    results.run()
    return {'schema': map(lambda s: s.name, results.schema), 'rows': results.rows}
