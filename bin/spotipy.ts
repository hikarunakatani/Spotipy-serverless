#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SpotipyPipelineStack } from "../lib/pipeline-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { BackendStack } from "../lib/backend-stack";

const pjPrefix = 'Spotipy';

const app = new cdk.App();

// ----------------------- Load context variables ------------------------------
const envVals = app.node.tryGetContext('envVals')

const emailAddress = envVals['emailAddress'];
const ipAddress = envVals['ipAddress'];

// For local deployment
const backend = new BackendStack(app, `${pjPrefix}BackendStack`, {
    emailAddress: emailAddress,
});

const frontend = new FrontendStack(app, `${pjPrefix}FrontendStack`, {
    lambdaFunc: backend.lambdaFunc,
    ipAddress: ipAddress
});

frontend.addDependency(backend); 

// For pipeline deployment
//new SpotipyPipelineStack(app, `${pjPrefix}PipelineStack`, {});


