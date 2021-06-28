import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as ecrAssets from "@aws-cdk/aws-ecr-assets";

export interface CdkFargateStackProps extends cdk.StackProps {
    cluster: eks.FargateCluster;
    appName: string;
    appNamespace: string;
    appPort: number;
    appLocalFolder: string;
    appDockerFilename: string;
}

export class EksFargateStack extends cdk.Stack {

    constructor(scope: cdk.App, id: string, props: CdkFargateStackProps) {
        super(scope, id, props);

        const cluster = props.cluster;

        cluster.addFargateProfile(
            `${props.appNamespace}FGProfile`, {
                selectors: [
                    {
                        namespace: props.appNamespace.toLowerCase(),
                        labels:{
                            "app.kubernetes.io/name": props.appName.toLowerCase() 
                        }
                    },
                ],
                }
        );
            
        const repo = new ecrAssets.DockerImageAsset(this, props.appName, {
            repositoryName: props.appName,
            directory: props.appLocalFolder,
            file: props.appDockerFilename
        });

        // const template = this.getKubernetesTemplates(
        //     repo,
        //     props.appNamespace,
        //     props.appName,
        //     props.appPort,
        //     1
        // )
        // cluster.addManifest(props.appName, ...template);

        const deployment = {
            apiVersion: "apps/v1",
            kind: "Deployment",
            metadata: { 
                namespace: props.appNamespace.toLowerCase(),
                name: props.appName.toLowerCase() 
            },
            spec: {
              replicas: 1,
              selector: { 
                  matchLabels: {
                    "app.kubernetes.io/name": props.appName.toLowerCase() 
                  }
                },
              template: {
                metadata: { 
                    labels: {
                        "app.kubernetes.io/name": props.appName.toLowerCase(),
                        "app": props.appName.toLowerCase(),
                    }
                },
                spec: {
                  containers: [
                    {
                      name: props.appName.toLowerCase(),
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
                namespace: props.appNamespace.toLowerCase(),
                name: props.appName.toLowerCase() + "-service",
            },
            spec: {
                type: "LoadBalancer",
                ports: [ { port: 80, targetPort: props.appPort } ],
                selector: {
                    "app.kubernetes.io/name": props.appName.toLowerCase()
                }
            }
        };

        const ingress = {
            apiVersion: "extensions/v1beta1",
            kind: "Ingress",
            metadata: { 
                namespace: props.appNamespace.toLowerCase(),
                name: props.appName.toLowerCase(),
                annotations: {
                    "kubernetes.io/ingress.class": "alb",
                    "alb.ingress.kubernetes.io/scheme": "internet-facing",
                    "alb.ingress.kubernetes.io/target-type": "ip"    
                }
            },
            spec: {
                rules: [
                    {
                        "http": {
                            paths: [
                                {
                                    path: "/*",
                                    backend: {
                                        serviceName: props.appName.toLowerCase() + "-service",
                                        servicePort: 80                  
                                    }
                                }
                            ]
                        }    
                    }
                ]
            }
        };

        new eks.KubernetesManifest(this, props.appName + '-kub', {
            cluster,
            manifest: [ deployment, service, ingress ]
        });  
    }
}