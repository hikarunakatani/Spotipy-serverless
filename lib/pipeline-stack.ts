import * as cdk from 'aws-cdk-lib'
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import { Construct } from 'constructs'
import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { SpotipyPipelineStage } from '../lib/pipeline-stage'

export class SpotipyPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        //Creates CodeCommit repository called 'SpoityRepo'
        const repo = new codecommit.Repository(this, 'SpotipyRepo', {
            repositoryName: "SpotipyRepo"
        });

        const pipeline = new CodePipeline(this, 'Pipeline', {
            pipelineName: 'SpotipyPipeline',
            synth: new CodeBuildStep('SynthStep', {
                input: CodePipelineSource.codeCommit(repo, 'master'),
                installCommands: [
                    'npm install -g aws-cdk'
                ],
                commands: [
                    'npm install -g npm',
                    'mkdir -p lambda_layer',
                    'pip install -r requirements.txt -t ./lambda_layer/python/lib/python3.9/site-packages',
                    'npm ci',
                    'npm run build',
                    'npx cdk synth'
                ]
            }
            )
        });

        //Adds deploy stage 
        const deploy = new SpotipyPipelineStage(this, 'Deploy');
        const deployStage = pipeline.addStage(deploy);

        //Adds test stage
        deployStage.addPost(
            new CodeBuildStep('TestAPIGatewayEndpoint', {
                projectName: 'TestAPIGatewayEndpoint',
                envFromCfnOutputs: {
                    ENDPOINT_URL: deploy.APIEndpoint
                },
                commands: [
                    'curl -Ssf $ENDPOINT_URL'
                ]
            })
        )
    }
}