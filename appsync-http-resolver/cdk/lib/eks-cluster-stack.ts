import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk8s from 'cdk8s';
import { AwsLoadBalancerController } from './aws-loadbalancer-controller';
import { NamespaceChart } from './charts/namespace';
import { AwsObservabilityConfigmap } from './charts/observability';

export interface EksProps extends cdk.StackProps {
    clusterName?: string;
}  

export class EksClusterStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;
  public readonly firstRegionRole: iam.Role;
  readonly cdk8sApp: cdk8s.App = new cdk8s.App();

  constructor(scope: cdk.Construct, id: string, props: EksProps) {
    super(scope, id, props);

    const masterRole = new iam.Role(this, 'cluster-master-role', {
        assumedBy: new iam.AccountRootPrincipal()
    });

    const vpc = new ec2.Vpc(this, "vpc", {
        maxAzs: 3
    });

    const cluster = new eks.FargateCluster(this, "fargate-cluster", {
        clusterName: props.clusterName,
        vpc: vpc,
        version: eks.KubernetesVersion.V1_18,
        mastersRole: masterRole,
        coreDnsComputeType: eks.CoreDnsComputeType.FARGATE,
        endpointAccess: eks.EndpointAccess.PUBLIC,
    });

    cluster.addCdk8sChart('aws-observability-namespace-chart', new NamespaceChart(this.cdk8sApp, "aws-observability", {name: "aws-observability"}));
    cluster.addCdk8sChart('observability-configmap-chart',new AwsObservabilityConfigmap(this.cdk8sApp, "observability-configmap"));    

    this.cluster = cluster;

    // Deploy AWS LoadBalancer Controller onto EKS.
    new AwsLoadBalancerController(this, 'aws-loadbalancer-controller', {
        eksCluster: cluster,
        namespace: 'kube-system'
    });
  }
}