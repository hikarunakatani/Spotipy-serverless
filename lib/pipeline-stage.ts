import * as cdk from 'aws-cdk-lib';
import { Stage, CfnOutput, StageProps, CfnOutputProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { SpotipyStack } from "../lib/spotipy-stack";

const app = new cdk.App();

// ----------------------- Load context variables ------------------------------
const envVals = app.node.tryGetContext('envVals')

const emailAddress = envVals['emailAddress'];
const ipAddress = envVals['ipAddress'];

// ----------------------- Define pipeline stage ------------------------------
export class SpotipyPipelineStage extends Stage {
    public readonly APIEndpoint: CfnOutput;

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        const Spotipy = new SpotipyStack(this, 'SpotipyStack', {
            emailAddress: emailAddress,
            ipAddress: ipAddress,
        });

        this.APIEndpoint = Spotipy.APIEndpoint;
    }
}