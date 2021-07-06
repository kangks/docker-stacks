import { CloudFormationClient, ListExportsCommand, CloudFormationClientConfig, ListExportsCommandInput, Export } from "@aws-sdk/client-cloudformation"; // ES Modules import
import { EKSClient, DescribeClusterCommand } from "@aws-sdk/client-eks"; // ES Modules import
import { EXPORTNAME_EKSCLUSTER_CLUSTERNAME, EXPORTNAME_EKSCLUSTER_MASTERROLEARN, EXPORTNAME_EKSCLUSTER_VPCID, EXPORTNAME_FARGATEPROFILE_NAME } from "./constants";

export const getFullyQualifiedExportName = (stackName: string, exportName: string) => [stackName,exportName].join("-");

export interface eksLookupAttributes {
    "clusterName": string;
    "clusterMaserRoleArn": string;
    "clusterVpcId": string
}

export interface stackEnvironment {
    account?: string;
    region?: string;
}

export class ExistingEksCluster {
    public GetStackExportValues : Promise<eksLookupAttributes>;
    // public GetStackRegionAccountValues : Promise<stackEnvironment>;
    private eksClusterStackName: string;
    private clusterName: string;

    getCfnExportValues():Promise<eksLookupAttributes>{
        const clusterName = getFullyQualifiedExportName(this.eksClusterStackName, EXPORTNAME_EKSCLUSTER_CLUSTERNAME);
        const clusterMaserRoleArn = getFullyQualifiedExportName(this.eksClusterStackName, EXPORTNAME_EKSCLUSTER_MASTERROLEARN);
        const clusterVpcId = getFullyQualifiedExportName(this.eksClusterStackName, EXPORTNAME_EKSCLUSTER_VPCID);
        const filterExportValue = (expts: Export[]) => (name: string) => expts.filter(theMap => theMap.Name?.localeCompare(name) == 0);
        const client = new CloudFormationClient(<CloudFormationClientConfig>{});
        const command = new ListExportsCommand(<ListExportsCommandInput>{});
        let values = <eksLookupAttributes>{};

        return client.send(command)
            .then(
                (response)=>{
                    if('Exports' in response && response.Exports != undefined && response.Exports.length > 0){
                        this.clusterName = filterExportValue(response.Exports)(clusterName)[0].Value || "";
                        values.clusterName = this.clusterName;
                        values.clusterMaserRoleArn = filterExportValue(response.Exports)(clusterMaserRoleArn)[0].Value || "";
                        values.clusterVpcId = filterExportValue(response.Exports)(clusterVpcId)[0].Value || "";
                        // return filterExportValue(response.Exports)(this.exportName)[0].Value;
                    }
                    return values;
                }
            )
            .catch(
                (err)=>{
                    console.log("Error: ", err);
                    throw err;
                }
            )
    }

    // getStackEnvironment():Promise<stackEnvironment>{
    //     const client = new EKSClient({});
    //     const command = new DescribeClusterCommand({name: this.clusterName});
    //     return client.send(command).then(
    //         (response)=>{
    //             const clusterArn = response.cluster?.arn;
    //             let config = <stackEnvironment>{};
    //             config.account = clusterArn?.split(":")[5];
    //             config.region = clusterArn?.split(":")[4];
    //             return config;
    //         }
    //     )
    // }

    constructor(eksClusterStackName:string){
        this.eksClusterStackName = eksClusterStackName;

        this.GetStackExportValues = new Promise<eksLookupAttributes>(
            (resolve, reject) => {
                this.getCfnExportValues().then(
                    result => {
                        resolve(result);
                    }
                ).catch(reject);
            }
        )
        // this.GetStackRegionAccountValues = new Promise<any>(
        //     (resolve, reject) => {
        //         this.getStackEnvironment().then(
        //             result => {
        //                 resolve(result);
        //             }
        //         ).catch(reject);
        //     }
        // )
    }
}

// export function getCfnExportValue(exportName:string):string{    
//     const filterExportValue = (expts: Export[]) => (name: string) => expts.filter(theMap => theMap.Name?.localeCompare(name) == 0);
//     const client = new CloudFormationClient(<CloudFormationClientConfig>{});
//     const command = new ListExportsCommand(<ListExportsCommandInput>{});

//     Promise.resolve(
//         client.send(command).then(
//             (response)=>{
//                 if('Exports' in response && response.Exports != undefined && response.Exports.length > 0){
//                     console.log("response.Exports:", response.Exports);
//                     return filterExportValue(response.Exports)(exportName)[0].Value;
//                 }else{
//                     return "";
//                 }
//             }
//         ).finally(()=>{return ""})
//     )
//     // return "";
//     // const response = client.send(command);
//     // if('Exports' in response && response.Exports != undefined && response.Exports.length > 0){
//     //     // console.log("response.Exports:", response.Exports);
//     //     return filterExportValue(response.Exports)(exportName)[0].Value || "";
//     // }
//     // return "";
// }

export function getEksClusterAccountRegion(clusterName:string){
    const client = new EKSClient({});
    const command = new DescribeClusterCommand({name: clusterName});
    client.send(command).then(
        (response)=>{
            console.log(response);
        }
    )
}