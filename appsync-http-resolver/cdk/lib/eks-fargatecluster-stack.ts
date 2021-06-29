import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk8s from 'cdk8s';
import { AwsLoadBalancerController } from './aws-loadbalancer-controller';
import { NamespaceChart } from './charts/namespace';
import { AwsObservabilityConfigmap } from './charts/observability';
import { SHARED_EKSCLUSTER_NAME,SHARED_EKSCLUSTER_ARN, SHARED_EKSCLUSTER_MASTERROLE_ARN} from "../input/input";

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
      version: eks.KubernetesVersion.V1_18,
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

    cluster.addCdk8sChart('aws-observability-namespace-chart', new NamespaceChart(this.cdk8sApp, "aws-observability", {name: "aws-observability"}));
    cluster.addCdk8sChart('observability-configmap-chart',new AwsObservabilityConfigmap(this.cdk8sApp, "observability-configmap", { region: cluster.env.region }));

    // Deploy AWS LoadBalancer Controller onto EKS.
    new AwsLoadBalancerController(this, 'aws-loadbalancer-controller', {
        eksCluster: cluster,
        namespace: 'kube-system'
    });

    // Needed at least 2 attributes to reuse existing EKS cluster
    //  as per https://docs.aws.amazon.com/cdk/api/latest/docs/aws-eks-readme.html#using-existing-clusters
    new cdk.CfnOutput(this, SHARED_EKSCLUSTER_NAME, {value: cluster.clusterName, exportName: `${this.stackName}:${SHARED_EKSCLUSTER_NAME}`});
    new cdk.CfnOutput(this, SHARED_EKSCLUSTER_MASTERROLE_ARN, {value: masterRole.roleArn, exportName: `${this.stackName}:${SHARED_EKSCLUSTER_MASTERROLE_ARN}`});
    new cdk.CfnOutput(this, SHARED_EKSCLUSTER_ARN, {value: cluster.clusterArn, exportName: `${this.stackName}:${SHARED_EKSCLUSTER_ARN}`});
  }
}