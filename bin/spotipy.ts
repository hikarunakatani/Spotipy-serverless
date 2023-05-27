#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SpotipyPipelineStack } from "../lib/pipeline-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { BackendStack } from "../lib/backend-stack";

const app = new cdk.App();

const pjPrefix = 'Spotipy';

// ----------------------- Load context variables ------------------------------
const envVals = app.node.tryGetContext('envVals')

// For pipeline deployment
const repo = envVals['sourceRepository'];
const branch = envVals['sourceBranch'];
const connectionArn = envVals['sourceConnectionArn'];

new SpotipyPipelineStack(app, `${pjPrefix}PipelineStack`, {
    repo: repo,
    branch: branch,
    connectionArn: connectionArn,
});


//// For local deployment
//const envVals = app.node.tryGetContext('envVals')
//
//const emailAddress = envVals['emailAddress'];
//const ipAddress = envVals['ipAddress'];
//
//const backend = new BackendStack(app, `${pjPrefix}BackendStack`, {
//    emailAddress: emailAddress,
//});
//
//const frontend = new FrontendStack(app, `${pjPrefix}FrontendStack`, {
//    lambdaFunc: backend.lambdaFunc,
//    ipAddress: ipAddress
//});
//frontend.addDependency(backend); 



