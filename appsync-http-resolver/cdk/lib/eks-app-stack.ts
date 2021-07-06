import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as ecrAssets from "@aws-cdk/aws-ecr-assets";
import * as cdk8s from 'cdk8s';
import * as ec2 from '@aws-cdk/aws-ec2';

import { NamespaceChart } from './charts/namespace';
import * as utils from './utils';

export interface EksAppProps extends cdk.StackProps {
    eksClusterStackName: string;
    appName: string;
    appPort: number;
    appLocalFolder: string;
    appDockerFilename: string;
}

export class EksAppStack extends cdk.Stack {

    readonly cdk8sApp: cdk8s.App = new cdk8s.App();

    async constructFactory(props: EksAppProps){
        const e = new utils.ExistingEksCluster(props.eksClusterStackName);

        const results = await e.GetStackExportValues

        if(results.clusterName != undefined){

            let existingCluster:eks.FargateCluster;
    
            existingCluster = eks.FargateCluster.fromClusterAttributes(this, "existingEksCluster", 
            {
                clusterName: results.clusterName,                
                kubectlRoleArn: results.clusterMaserRoleArn,
                vpc: ec2.Vpc.fromLookup(this, "clusterVpc", {vpcId: results.clusterVpcId}) 
            }) as eks.FargateCluster;
                
            const appName = cdk8s.Names.toDnsLabel(props.appName);
            const appNameLabel = cdk8s.Names.toLabelValue(props.appName);

            const serviceName = `${appName}`;

            const repo = new ecrAssets.DockerImageAsset(this, `${appNameLabel}-ecr`, {
                repositoryName: appNameLabel,
                directory: props.appLocalFolder,
                file: props.appDockerFilename
            });

            const deployment = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata: { 
                    name: `${appName}-deployment`
                },
                spec: {
                    replicas: 1,
                    selector: { 
                        matchLabels: {
                        "app.kubernetes.io/name": appNameLabel 
                        }
                    },
                    template: {
                    metadata: { 
                        labels: {
                            "app.kubernetes.io/name": appNameLabel
                        }
                    },
                    spec: {
                        containers: [
                        {
                            name: appName,
                            image: repo.imageUri,
                            ports: [ { containerPort: props.appPort } ]
                        }
                        ]
                    }
                    }
                }
                };

            const service = {
                apiVersion: "v1",
                kind: "Service",
                metadata: { 
                    name: serviceName
                },
                spec: {
                    type: "LoadBalancer",
                    ports: [ { port: 80, targetPort: props.appPort } ],
                    selector: {
                        "app.kubernetes.io/name": appNameLabel
                    }
                }
            };

            // https://kubernetes.io/docs/concepts/services-networking/ingress/#the-ingress-resource
            const ingress = {
                apiVersion: "networking.k8s.io/v1",
                kind: "Ingress",
                metadata: { 
                    name: `${appName}-ingress`,
                    annotations: {
                        "kubernetes.io/ingress.class": "alb",
                        "alb.ingress.kubernetes.io/scheme": "internet-facing",                        
                        "alb.ingress.kubernetes.io/group.name": "app-ingress",
                        "alb.ingress.kubernetes.io/target-type": "ip"
                    }
                },
                spec: {
                    rules: [
                        {
                            "http": {
                                paths: [
                                    {
                                        path: "/",
                                        pathType: "Prefix",
                                        backend: {
                                            service: {
                                                name: serviceName,
                                                port: {
                                                    number: 80
                                                }    
                                            }
                                        }
                                    }
                                ]
                            }    
                        }
                    ]
                }
            };

            new eks.KubernetesManifest(this, `${appNameLabel}-kub`, {
                cluster: existingCluster,
                manifest: [ deployment, service, ingress ]
            });  
        }
    }

    constructor(scope: cdk.App, id: string, props: EksAppProps) {
        super(scope, id, props);

        this.constructFactory(props);
    }
}