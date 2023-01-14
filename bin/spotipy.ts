#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SpotipyPipelineStack } from "../lib/pipeline-stack";
import { SpotipyStack } from "../lib/spotipy-stack";

const app = new cdk.App();

new SpotipyPipelineStack(app, "SpotipyPipelineStack")
//new SpotipyStack(app, "SpotipyStack") 
