import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/core');
import iam = require("@aws-cdk/aws-iam");
import { ApplicationLoadBalancedFargateService } from "@aws-cdk/aws-ecs-patterns";
import path = require('path');

export class CdkStack extends cdk.Stack {
  public readonly accountManagementUrl: cdk.CfnOutput
  public readonly userManagementUrl: cdk.CfnOutput

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const executionRole = new iam.Role(this, "TaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
    });
    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      )
    );

    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
    });
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      )
    );    

    const logging = new ecs.AwsLogDriver({
      streamPrefix: "appsync-servers",
    })    
        
    const accountTaskDef = new ecs.FargateTaskDefinition(this, "accountTaskDefinition", {
      cpu: 256,
      memoryLimitMiB: 512,
      executionRole: executionRole,
      taskRole: taskRole
    });

    const accountContainerDef = new ecs.ContainerDefinition(this, 'accountManagementContainerDef', {
      taskDefinition: accountTaskDef,
      logging: logging,
      image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, '../../http-graphql'), {file: "Dockerfile.accountManagement"}),
    })

    accountContainerDef.addPortMappings({
      containerPort: 4000,
      protocol: ecs.Protocol.TCP
    });    

    const accountManagementService = new ApplicationLoadBalancedFargateService(this, 
      "accountManagementService", 
      {
        serviceName: 'accountManagementService',
        taskDefinition: accountTaskDef,
        listenerPort: 80,
        desiredCount: 1, 
        publicLoadBalancer: true,
      }
    );

    const userTaskDef = new ecs.FargateTaskDefinition(this, "userTaskDefinition", {
      cpu: 256,
      memoryLimitMiB: 512,
      executionRole: executionRole,
      taskRole: taskRole
    });

    const userContainerDef = new ecs.ContainerDefinition(this, 'userManagementContainerDef', {
      taskDefinition: userTaskDef,
      logging: logging,
      image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, '../../http-graphql'), {file: "Dockerfile.userManagement"}),
    })

    userContainerDef.addPortMappings({
      containerPort: 4000,
      protocol: ecs.Protocol.TCP
    });    

    const userManagementService = new ApplicationLoadBalancedFargateService(this, 
      "userManagementService", 
      {
        serviceName: 'userManagementService',
        taskDefinition: userTaskDef,
        listenerPort: 80,
        desiredCount: 1, 
        publicLoadBalancer: true,
      }
    );

    this.accountManagementUrl = new cdk.CfnOutput(this, 'accountManagementUrl', {value: "http://" + accountManagementService.loadBalancer.loadBalancerDnsName + "/graphql"});
    this.userManagementUrl = new cdk.CfnOutput(this, 'userManagementUrl', {value: "http://" + userManagementService.loadBalancer.loadBalancerDnsName + "/graphql"})
  }
}
