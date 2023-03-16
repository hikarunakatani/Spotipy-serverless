import * as cdk from 'aws-cdk-lib';
import { Stage, CfnOutput, StageProps, CfnOutputProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { BackendStack } from "../lib/backend-stack";
import { FrontendStack } from "../lib/frontend-stack";

const pjPrefix = 'Spotipy';

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

        const backend = new BackendStack(this, `${pjPrefix}BackendStack`, {
            emailAddress: emailAddress,
        });
        
        const frontend = new FrontendStack(this, `${pjPrefix}FrontendStack`, {
            lambdaFunc: backend.lambdaFunc,
            ipAddress: ipAddress
        });

        frontend.addDependency(backend);

        this.APIEndpoint = frontend.APIEndpoint;
    }
}