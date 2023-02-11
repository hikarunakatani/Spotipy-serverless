import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as fs from "fs";

export interface FrontendStackProps extends cdk.StackProps {
  lambdaFunc: lambda.Function;
  ipAddress: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly APIEndpoint: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // ----------------------- Define frontend system ------------------------------

    // Define a s3 bucket
    const websiteBucket = new s3.Bucket(this, "websiteBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Define an OAI for s3 bucket
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "originAccessIdentity", { comment: `identity-for-S3` });

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
    const CfnIPset = new wafv2.CfnIPSet(this, "CfnIPSet", {
      addresses: [props.ipAddress],
      ipAddressVersion: "IPV4",
      scope: "CLOUDFRONT",
    });

    //Define a WebACL
    //L2 construct is not available:2022/12/31
    const CfnWebACL = new wafv2.CfnWebACL(this, "CfnWebACL", {
      defaultAction: {
        block: {}
      },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "cfnWebACL",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "ruleForWebACL",
          priority: 100,
          statement: {
            ipSetReferenceStatement: {
              arn: CfnIPset.attrArn,

            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "IPSet",
            sampledRequestsEnabled: true,
          },
          action: {
            allow: {}
          },
        }
      ]
    });

    // Define a distribution for s3 bucket
    const distribution = new cloudfront.Distribution(this, "distribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity,
        }),
      },
      comment: "s3-distribution",
      defaultRootObject: "index.html",
      webAclId: CfnWebACL.attrArn,
    });

    // Define an APIGateway REST API
    const apiGateway = new apigw.LambdaRestApi(this, "apiGateway", {
      handler: props.lambdaFunc,
    });

    this.APIEndpoint = new cdk.CfnOutput(this, "APIEndpoint", {
      value: apiGateway.url,
      exportName: "APIEndpoint",
    })

    // Generate html content
    const fileName = "./webcontent/index.html";
    let htmlContent = fs.readFileSync(fileName, "utf8");
    const APIEndpoint = apiGateway.url

    htmlContent = htmlContent.replace("APIEndpoint", APIEndpoint);

    // Deploy webcontent in the local folder into s3 bucket
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [
        s3deploy.Source.data(
          "/index.html",
          htmlContent),
      ],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ["/*"],
    });
  }
}
