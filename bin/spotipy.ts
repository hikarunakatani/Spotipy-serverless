#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SpotipyPipelineStack } from "../lib/pipeline-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { BackendStack } from "../lib/backend-stack";

const app = new cdk.App();

const pjPrefix = 'Spotipy';

const repo = app.node.tryGetContext('source-repository');
const branch = app.node.tryGetContext('source-branch');
const connectionArn = app.node.tryGetContext('source-connection-arn');

// ----------------------- Load context variables ------------------------------
//const envVals = app.node.tryGetContext('envVals')
//
//const emailAddress = envVals['emailAddress'];
//const ipAddress = envVals['ipAddress'];
//
//// For local deployment
//const backend = new BackendStack(app, `${pjPrefix}BackendStack`, {
//    emailAddress: emailAddress,
//});
//
//const frontend = new FrontendStack(app, `${pjPrefix}FrontendStack`, {
//    lambdaFunc: backend.lambdaFunc,
//    ipAddress: ipAddress
//});
//frontend.addDependency(backend); 

// For pipeline deployment
new SpotipyPipelineStack(app, `${pjPrefix}PipelineStack`, {
    repo,
    branch,
    connectionArn,
});


