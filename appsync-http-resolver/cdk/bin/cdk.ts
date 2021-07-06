#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import { EksFargateClusterStack } from "../lib/eks-fargatecluster-stack";
import { EksAppStack } from "../lib/eks-app-stack";
import * as inputs from "../input/input";

const app = new cdk.App();

const clusterStack = new EksFargateClusterStack(app, inputs.EKSCLUSTER_STACKNAME, {
  clusterName: "eksCluster120"
});

new EksAppStack(app, 'app', {
  eksClusterStackName: inputs.EKSCLUSTER_STACKNAME,
  appName: "calculator",
  appPort: 4000,
  appLocalFolder: path.resolve(__dirname, "../../http-graphql"),
  appDockerFilename: "Dockerfile.calculator",
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
});