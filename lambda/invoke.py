import traceback
import json
import main 
from common import send_email
import sys
import io

def handler(event, context):
    try:
        # Refer to the spotipy_lambda.py to get information of options.
        # Output values of console into string variable
        with io.StringIO() as console_log:
            sys.stdout = console_log
            main.diggin_in_the_crate(1)
            log_value = console_log.getvalue()
            sys.stdout = sys.__stdout__
        
        print(log_value)
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

