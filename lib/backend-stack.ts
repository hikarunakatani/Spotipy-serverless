import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import secretValue from "../secret.json";

export interface BackendStackProps extends cdk.StackProps {
  emailAddress: string;
}

export class BackendStack extends cdk.Stack {
  public readonly lambdaFunc: lambda.Function;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // ----------------------- Define backend system ------------------------------

    // Define a topic for lambda
    const topic = new Topic(this, "topic", {
      displayName: "Topic sent from Lambda",
    });

    topic.addSubscription(new EmailSubscription(props.emailAddress));

    const secret = new secretsmanager.Secret(this, "secret", {
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
    const lambdaLayer = new lambda.LayerVersion(this, "lambdaLayer", {
      code: lambda.AssetCode.fromAsset("lambda_layer"),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
    });

    // Define a lambda Function
    const lambdaFunc = new lambda.Function(this, "lambdaFunc", {
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
        ON_AWS: "True"
      },
    });

    this.lambdaFunc = lambdaFunc

    // Define an EventBridge rule
    const ruleToInvokeLambda = new Rule(this, "ruleToInvokeLambda", {
      schedule: Schedule.cron({
        minute: "0",
        hour: "0",
        month: "*",
        year: "*",
        weekDay: "L",
      }),
      targets: [new LambdaFunction(lambdaFunc)],
    });
  }
}
