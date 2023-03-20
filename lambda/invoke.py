import traceback
import json
import main 
from common import send_email
import sys
import base64
import urllib.parse
from urllib.parse import parse_qs
import io

def handler(event, context):
    try:
        # Refer to the spotipy_lambda.py to get information of options.
        # Output values of console into string variable
        with io.StringIO() as console_log:
            sys.stdout = console_log
            # Parse JSON strings
            request_body=parse_qs(event['body'])
            main.diggin_in_the_crate(int(request_body['track_num'][0]))
            log_value = console_log.getvalue()
            sys.stdout = sys.__stdout__

        send_email(log_value)
            
        return {
            'isBase64Encoded': False,
            'statusCode': 200,
            'headers': {},
            'body': json.dumps({"result": "Successfully processed!!"})
        }
    except BaseException:
        error_message = traceback.format_exc()
        return {
            'isBase64Encoded': False,
            'statusCode': 500,
            'headers': {},
            'body': json.dumps({"result": "An error occured", "error_message": error_message})
        }

