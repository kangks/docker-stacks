const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
 
const schema = buildSchema(`
  scalar JSON
  type Query {
    data: JSON
  }
`);
  
const app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: {
    data: () => {
      return {
        account: "account01",
        timestamp: Date.now()
      };
    },
  },
  graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/graphql');