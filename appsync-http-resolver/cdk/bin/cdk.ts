#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import { EksClusterStack } from "../lib/eks-cluster-stack";
import { EksFargateStack } from "../lib/eks-fargate-stack";

const app = new cdk.App();

const eksCluster = new EksClusterStack(app, 'SimpleEksFargateCluster', {
  clusterName: "SimpleEksFargateCluster"
});
new EksFargateStack(app, 'userManagementFargate', {
  cluster: eksCluster.cluster,
  appName: "userManagement",
  appNamespace: "default",
  appPort: 4000,
  appLocalFolder:  path.resolve(__dirname, '../../http-graphql'),
  // appDockerFilename: "Dockerfile.userManagement"
  appDockerFilename: "Dockerfile.accountManagement"
})
// new EksFargateStack.EksFargateStack(app, 'accountManagementFargate', {
//   cluster: eksCluster.cluster,
//   appName: "accountManagement",
//   appNamespace: "accountManagementNS",
//   appPort: 4000,
//   appLocalFolder:  path.resolve(__dirname, '../../http-graphql'),
//   appDockerFilename: "Dockerfile.accountManagement"
// })