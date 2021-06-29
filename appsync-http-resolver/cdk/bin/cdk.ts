#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import { EksFargateClusterStack } from "../lib/eks-fargatecluster-stack";
import { EksFargateProfileStack } from '../lib/eks-fargate-profile-stack';
import { EksAppStack } from "../lib/eks-app-stack";
import {SHARED_EKSCLUSTER_STACKNAME, SHARED_EKSCLUSTER_NAME} from "../input/input";

const app = new cdk.App();

new EksFargateClusterStack(app, SHARED_EKSCLUSTER_STACKNAME, {
  clusterName: SHARED_EKSCLUSTER_NAME
});

new EksFargateProfileStack(app, 'appFargateProfile',{
  appNamespace: "app",
});

