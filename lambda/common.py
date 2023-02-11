import spotipy
import spotipy.util as util
import ast
import base64
import boto3
from botocore.exceptions import ClientError
import random
import os
import json

scope = 'playlist-read-private playlist-modify-public'

def authenticate(local_test_flag=False):
    """Execute authentication on process spotify.
    """
    secret = get_secret(local_test_flag)

    token = util.prompt_for_user_token(
        secret['username'], scope, secret['my_id'], secret['my_secret'], secret['redirect_uri'])

    sp = spotipy.Spotify(auth=token)

    return sp


def get_random_search():
    """Get a random character of unicode.
    """

    rand_char = ''

    while rand_char == '':
        rand_char = chr(random.randint(0, 1114111))

    random_search = ''

    if random.randint(0, 2) == 0:
        random_search = rand_char + '%'
    elif random.randint(0, 2) == 1:
        random_search = '%' + rand_char + '%'
    else:
        random_search = '%' + rand_char

    return random_search


def get_secret(local_test_flag=False):
    """Get secrets values from AWS Secrets Manager.
    """

    if local_test_flag == True:
        json_open = open('../secret.json', 'r')
        json_load = json.load(json_open)
        secret = json_load
    else:
        secret_name = os.environ['SECRET_ARN']
        region_name = "us-east-1"

        # Create a Secrets Manager client
        session = boto3.session.Session()
        client = session.client(
            service_name='secretsmanager',
            region_name=region_name
        )

        try:
            get_secret_value_response = client.get_secret_value(
                SecretId=secret_name
            )
        except ClientError as e:
            raise e

        else:
            if 'SecretString' in get_secret_value_response:
                secret_raw = get_secret_value_response['SecretString']
            else:
                secret_raw = base64.b64decode(
                    get_secret_value_response['SecretBinary'])

        # Convert secrets into dictionary object.
        secret = ast.literal_eval(secret_raw)

    return secret


def send_email(log_value):
    """Send an email form AWS SNS.
    """

    region_name = "us-east-1"

    # Create a SNS client
    session = boto3.session.Session()
    client = session.client(
        service_name='sns',
        region_name=region_name
    )
    params = {
        'TopicArn': os.environ['TOPIC_ARN'],
        'Subject': 'Lambda process completed!',
        'Message': log_value
    }

    client.publish(**params)
