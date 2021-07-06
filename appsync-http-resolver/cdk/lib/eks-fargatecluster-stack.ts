import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk8s from 'cdk8s';
import * as utils from './utils';

import { AwsLoadBalancerController } from './aws-loadbalancer-controller';
import { NamespaceChart } from './charts/namespace';
import { AwsObservabilityConfigmap } from './charts/observability';
import { EXPORTNAME_EKSCLUSTER_CLUSTERARN, EXPORTNAME_EKSCLUSTER_CLUSTERNAME, EXPORTNAME_EKSCLUSTER_MASTERROLEARN, EXPORTNAME_EKSCLUSTER_VPCID } from "./constants";

export interface EksProps extends cdk.StackProps {
    clusterName?: string;
}  

export class EksFargateClusterStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;
  public readonly eksRole: iam.Role;
  readonly cdk8sApp: cdk8s.App = new cdk8s.App();

  constructor(scope: cdk.Construct, id: string, props: EksProps) {
    super(scope, id, props);

    const masterRole = new iam.Role(this, 'cluster-master-role', {
        assumedBy: new iam.AccountRootPrincipal()
    });

    const vpc = new ec2.Vpc(this, "vpc", {
        maxAzs: 3
    });

    const fargateProfileRole = new iam.Role(this, "fargate-profile-role", {
      assumedBy: new iam.ServicePrincipal("eks-fargate-pods.amazonaws.com"),
      managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSFargatePodExecutionRolePolicy")
      ],
      inlinePolicies: {
        "cloudWatchPolicy": new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                  "logs:CreateLogStream",
                  "logs:CreateLogGroup",
                  "logs:DescribeLogStreams",
                  "logs:PutLogEvents"
              ],
              resources: ["*"]
            })
          ]
        })
      }
    })

    const cluster = new eks.FargateCluster(this, "fargate-cluster", {
      clusterName: props.clusterName,
      vpc: vpc,
      version: eks.KubernetesVersion.V1_20,
      mastersRole: masterRole,
      coreDnsComputeType: eks.CoreDnsComputeType.FARGATE,
      endpointAccess: eks.EndpointAccess.PUBLIC,
      // override the default fargate profile created by fargate cluster
      defaultProfile: {
        selectors: [
          { namespace: "default" },
          { namespace: "kube-system" }
        ],
        podExecutionRole: fargateProfileRole
      }
    });

    const observabilityNS = new NamespaceChart(this.cdk8sApp, "aws-observability", {name: "aws-observability"});
    const observabilityConfig = new AwsObservabilityConfigmap(this.cdk8sApp, "observability-configmap", { region: cluster.env.region });
    observabilityConfig.addDependency(observabilityNS);

    cluster.addCdk8sChart(`aws-observability-ns`, observabilityNS);
    cluster.addCdk8sChart(`aws-observability-configmap`, observabilityConfig);

    // Deploy AWS LoadBalancer Controller onto EKS.
    const albController = new AwsLoadBalancerController(this, 'aws-loadbalancer-controller', {
        eksCluster: cluster,
        namespace: 'kube-system'
    });
    albController.node.addDependency(observabilityNS);

    // Exported values for post-creation cluster reference
    // Needed at least 2 attributes to reuse existing EKS cluster
    //  as per https://docs.aws.amazon.com/cdk/api/latest/docs/aws-eks-readme.html#using-existing-clusters
    new cdk.CfnOutput(this, EXPORTNAME_EKSCLUSTER_CLUSTERNAME, {value: cluster.clusterName, exportName: utils.getFullyQualifiedExportName(this.stackName, EXPORTNAME_EKSCLUSTER_CLUSTERNAME)});
    new cdk.CfnOutput(this, EXPORTNAME_EKSCLUSTER_CLUSTERARN, {value: cluster.clusterArn, exportName: utils.getFullyQualifiedExportName(this.stackName, EXPORTNAME_EKSCLUSTER_CLUSTERARN)});
    new cdk.CfnOutput(this, EXPORTNAME_EKSCLUSTER_VPCID, {value: cluster.vpc.vpcId, exportName: utils.getFullyQualifiedExportName(this.stackName, EXPORTNAME_EKSCLUSTER_VPCID)});
    new cdk.CfnOutput(this, EXPORTNAME_EKSCLUSTER_MASTERROLEARN, {value: cluster.kubectlRole?.roleArn || "", exportName: utils.getFullyQualifiedExportName(this.stackName, EXPORTNAME_EKSCLUSTER_MASTERROLEARN)});
  }
}