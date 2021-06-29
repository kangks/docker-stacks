import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s';
import {SHARED_EKSCLUSTER_STACKNAME, SHARED_EKSCLUSTER_NAME, SHARED_EKSCLUSTER_MASTERROLE_ARN, SHARED_FARGATEPROFILE_NAME} from "../input/input";

export interface CdkFargateProfileStackProps extends cdk.StackProps {
    appNamespace: string;
}

export class EksFargateProfileStack extends cdk.Stack {
    // readonly cluster: eks.Cluster;

    constructor(scope: cdk.App, id: string, props: CdkFargateProfileStackProps) {
        super(scope, id, props);

        // Needed at least 2 attributes to reuse existing EKS cluster
        //  as per https://docs.aws.amazon.com/cdk/api/latest/docs/aws-eks-readme.html#using-existing-clusters
        const clusterName = cdk.Fn.importValue(`${SHARED_EKSCLUSTER_STACKNAME}:${SHARED_EKSCLUSTER_NAME}`);
        const clusterMaserRoleArn = cdk.Fn.importValue(`${SHARED_EKSCLUSTER_STACKNAME}:${SHARED_EKSCLUSTER_MASTERROLE_ARN}`);

        try{            
            const cluster = eks.Cluster.fromClusterAttributes(this, "existingEksCluster", 
            {
                clusterName: clusterName,
                kubectlRoleArn: clusterMaserRoleArn
            }) as eks.Cluster;
                
            const namespace = cdk8s.Names.toDnsLabel(props.appNamespace);
    
            const fargateProfile = new eks.FargateProfile(this, `${namespace}-FGProfile`,
                {
                    cluster: cluster,
                    fargateProfileName: `${namespace}-FGProfile`,
                    selectors: [
                        {
                            namespace: namespace
                        },
                    ],
                }
            )
    
            new cdk.CfnOutput(this, SHARED_FARGATEPROFILE_NAME, {value: fargateProfile.fargateProfileName});
        }catch(e) {
            if (e instanceof TypeError){
                console.info(`Invalid stack ${SHARED_EKSCLUSTER_STACKNAME} or export values`)
                console.error(e);
            }else{
                throw e;
            }
        }
    }
}