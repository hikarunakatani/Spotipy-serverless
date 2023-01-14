import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as fs from 'fs';
import secretValue from "../secret.json";

export interface SpotipyStackProps extends cdk.StackProps {
  emailAddress: string;
  ipAddress: string;
}

export class SpotipyStack extends cdk.Stack {
  public readonly APIEndpoint: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: SpotipyStackProps) {
    super(scope, id, props);

    // ----------------------- Define backend system ------------------------------

    // Define a topic for lambda
    const topic = new Topic(this, "Topic", {
      displayName: "Your Lambda function has been successfully processed!!",
    });

    topic.addSubscription(new EmailSubscription(props.emailAddress));

    const secret = new secretsmanager.Secret(this, "spotipy-secret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify(secretValue),
        generateStringKey: "password",
      },
    });

    // Define a role for lambda
    const lambdaRole = new iam.Role(this, "lambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    // Grant lambda to get secrets values from secrets manager
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["secretsmanager:GetSecretValue", "sns:Publish"],
      })
    );

    // Define a lambda layer
    const lambdaLayer = new lambda.LayerVersion(this, "LambdaLayer", {
      code: lambda.AssetCode.fromAsset("lambda_layer"),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
    });

    // Define a lambda Function
    const lambdaFunc = new lambda.Function(this, "Spotipy", {
      functionName: "Spotipy",
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda"),
      handler: "invoke.handler",
      layers: [lambdaLayer],
      role: lambdaRole,
      timeout: cdk.Duration.minutes(15),
      environment: {
        TOPIC_ARN: topic.topicArn,
        SECRET_ARN: secret.secretArn,
      },
    });

    // defines an API Gateway REST API resource backed by lambda function.
    const apigateway = new apigw.LambdaRestApi(this, "Endpoint", {
      handler: lambdaFunc,
    });

    this.APIEndpoint = new cdk.CfnOutput(this, 'APIEndpoint', {
      value: apigateway.url,
      exportName: 'APIEndpoint',
    })

    // Define an EventBridge rule
    const rule = new Rule(this, "RuleToInvokeLambda", {
      schedule: Schedule.cron({
        minute: "0",
        hour: "0",
        month: "*",
        year: "*",
        weekDay: "L",
      }),
      targets: [new LambdaFunction(lambdaFunc)],
    });

    // ----------------------- Define frontend system ------------------------------

    // Define a s3 bucket
    const websiteBucket = new s3.Bucket(this, "bucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Define an OAI for s3 bucket
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "originAccessIdentity",
      {
        comment: `identity-for-S3`,
      }
    );

    // Define a bucket policy
    const S3BucketPolicy = new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      effect: cdk.aws_iam.Effect.ALLOW,
      principals: [
        new iam.CanonicalUserPrincipal(
          originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
      resources: [`${websiteBucket.bucketArn}/*`],
    });

    // Add bucket policy
    websiteBucket.addToResourcePolicy(S3BucketPolicy);

    // Define an IPset for waf
    const cfnIPset = new wafv2.CfnIPSet(this, 'CfnIPSet', {
      addresses: [props.ipAddress],
      ipAddressVersion: 'IPV4',
      scope: 'CLOUDFRONT',
    });

    //Define a WebACL
    //* L2 construct is not available:2022/12/31
    const cfnWebACL = new wafv2.CfnWebACL(this, 'CfnWebACL', {
      defaultAction: {
        block: {}
      },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'cfnWebACL',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'ruleForWebACL',
          priority: 100,
          statement: {
            ipSetReferenceStatement: {
              arn: cfnIPset.attrArn,

            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'IPSet',
            sampledRequestsEnabled: true,
          },
          action: {
            allow: {}
          },
        }
      ]
    });


    //Define a distribution for s3 bucket
    const distribution = new cloudfront.Distribution(this, "distribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity,
        }),
      },
      comment: "s3-distribution",
      defaultRootObject: "index.html",
      webAclId: cfnWebACL.attrArn,
    });

    // Generate html content
    const fileName = './webcontent/index.html';
    let htmlContent = fs.readFileSync(fileName, 'utf8');
    const APIEndpoint = apigateway.url;

    htmlContent = htmlContent.replace('APIEndpoint', APIEndpoint);

    // Deploy webcontent in the local folder into s3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        s3deploy.Source.data(
          '/index.html',
          htmlContent),
      ],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });

  }
}
