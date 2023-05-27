import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { SpotipyPipelineStage } from '../lib/pipeline-stage'

interface SpotipyPipelineStackProps extends cdk.StackProps {
    repo: string;
    branch: string;
    connectionArn: string;
}

export class SpotipyPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: SpotipyPipelineStackProps) {
        super(scope, id, props);

        const pipeline = new CodePipeline(this, 'Pipeline', {
            synth: new cdk.pipelines.ShellStep('Synth', {
                input: CodePipelineSource.connection(props.repo, props.branch, {
                    connectionArn: props.connectionArn,
                }),

                installCommands: [
                    'npm install -g npm',
                    'npm install -g aws-cdk',
                ],
                commands: [
                    'mkdir -p lambda_layer',
                    'pip install -r requirements.txt -t ./lambda_layer/python/lib/python3.9/site-packages',
                    'npm ci',
                    'npm run build',
                    'npx cdk synth'
                ]
            },
            ),
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
                    'curl -X POST --data-urlencode "track_num=1" "${ENDPOINT_URL}sync"',
                    'curl -X POST --data-urlencode "track_num=1" "${ENDPOINT_URL}async"'
                ]
            })
        )
    }
}