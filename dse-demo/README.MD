# DataStax DSE with OpsCenter demo

## Folder structure

```
   .
   ├── .env                         # define the version of DSE to be used in the docker compose file
   ├── .cassandraWorkbench.jsonc    # the configuration for [Cassandra Workbench](https://github.com/kdcro101/vscode-cassandra)
   ├── docker-compose.yml           # Docker compose file
```

## Note

The `OpsCenter` needed the IP of the DSE cluster, thus using a fixed IP [`172.21.0.11`](https://github.com/kangks/docker-stacks/blob/master/dse-demo/docker-compose.yml#L41) is easier for the configuration

## To Run
1. git clone this repository
2. change into this folder `dse-demo`
3. run docker compose with command `docker-compose up --remove-orphans --abort-on-container-exit`
4. If the startup is successful, the following should be seen in the console
   ```
   datastax-dse-1    | INFO  [DSE main thread] 2021-05-10 11:42:32,252  DseDaemon.java:818 - DSE startup complete.
   ```
1. Open [http://localhost:8888/](http://localhost:8888/) in a browser
2. Select `Manage existing cluster`
3. In the screen `Connect to Existing Cluster`, enter the address of the DSE cluster `172.21.0.11`, and select `Next`
4. DSE image has agent preinstalled. Select `Install agents manually` in the agent installation screen

## Connect with Cassandraw Workbench

1. Install the [Cassandra Workbench Visual Studio Code Extensions](https://github.com/kdcro101/vscode-cassandra) if you have not
2. Open the Cassandra Workbench extension
3. The workbench should show the default keyspace of the DSE
   ![Cassandra Workbench](/images/Cassandra_Workbench.png)
