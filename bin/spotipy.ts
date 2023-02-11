#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SpotipyPipelineStack } from "../lib/pipeline-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { BackendStack } from "../lib/backend-stack";

const app = new cdk.App();

// For pipeline deployment
//new SpotipyPipelineStack(app, "SpotipyPipelineStack")


// For local deployment
// ----------------------- Load context variables ------------------------------
const envVals = app.node.tryGetContext('envVals')

const emailAddress = envVals['emailAddress'];
const ipAddress = envVals['ipAddress'];

const backend = new BackendStack(app, "BackendStack", {
    emailAddress: emailAddress,
});

const frontend = new FrontendStack(app, "FrontendStack", {
    lambdaFunc: backend.lambdaFunc,
    ipAddress: ipAddress
});


