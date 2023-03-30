# Spotipy-Serverless
SpotifyAPIを用いたサーバーレスアプリをAWS CDKで実装したリポジトリです。

![システム構成](architecture/architecture.png)

## Prerequisites
- AWS CLI
- AWS account
- Node.js
- AWS CDK
- Python

## Usage

1. Install AWS CDK

```shell
'npm install -g aws-cdk',
```

2. Install npm dependencies

```shell
'npm ci',
'npm run build'
```

3. Install pip dependencies

```shell
'mkdir -p lambda_layer',
'pip install -r requirements.txt -t ./lambda_layer/python/lib/python3.9/site-packages'
```

## Useful commands

* `npm run build`   
compile typescript to js
* `npm run watch`   
watch for changes and compile
* `npm run test`    
perform the jest unit tests
* `cdk deploy`      
deploy this stack to your default AWS account/region
* `cdk diff`        
compare deployed stack with current state
* `cdk synth`       
emits the synthesized CloudFormation template

