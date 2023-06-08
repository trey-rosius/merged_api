# Documentation

AWS AppSync is a fully managed GraphQL service that makes it easy to build scalable, secure, and serverless GraphQL APIs. AppSync provides a number of features that make it a great choice for building GraphQL APIs, including:

* **Automatic schema population:** AppSync can automatically populate your schema with data from your data sources, making it easy to get started with GraphQL.
* **Caching:** AppSync can cache your GraphQL queries and responses, which can improve performance and reduce latency.
* **Real-time data:** AppSync can support real-time data updates, which can be useful for applications that need to keep their data up-to-date.

In addition to these features, AppSync also recently introduced a new feature called Merged APIs. Merged APIs allow you to combine multiple AppSync APIs into a single API. This can be useful for a number of reasons, such as:

* **Reduced complexity:** With Merged APIs, you can manage a single API instead of multiple APIs. This can reduce complexity and make it easier to manage your APIs.
* **Improved performance:** Merged APIs can improve performance by reducing the number of requests that need to be made to your data sources.
* **Increased flexibility:** Merged APIs give you more flexibility in how you architect your applications. You can use Merged APIs to combine APIs from different teams or departments, or to combine APIs that use different data sources.

To explain this, I build a website with two Appsync functions, one to manage cars and another to manage rent.

The application will provide authentication with AWS Cognito on the two apps.

## Authentication

Authentication required us to create cognito resources like UserPool, UserPoolClient, and ClientDomain.

Create a folder name user and inside in the command line interface type `sam init` to create the serverless with the hello world application at the top of the `template.yaml` file

Specify the template version, The description of the app, and the Transform to use.

```
AWSTemplateFormatVersion: 2010-09-09
Description: >-
  auth-app
Transform:
- AWS::Serverless-2016-10-31

```

And after creating the parameter that will be passed through cli or from a parameter file

The client domain, the project environment (It can be Dev, Prod, Staging, or any else), And the techStack which is graphql because this authentication system will be attached to Appsync API.

```
Parameters:
  ClientDomain:
    Type: String
    Description: Domain allowed to use this UserPool
  Env:
    Type: String
    Description: Environnement name
    Default: dev
  TechStack:
    Type: String
    Description: Framework used or resource used.
    Default: graphql

```

Now let's define the resources that we want

First, we need t create a Userpool.

To create a Userpool we need to specify the name `UserPoolName`, The password policy, the username attributes, and the attributes

```
  UserPool:
    Type: AWS::Cognito::UserPool 
    Properties:
      UserPoolName: !Sub userpool-app-${TechStack}-${Env}
      Policies: 
        PasswordPolicy: 
          MinimumLength: 8
      AutoVerifiedAttributes:
        - email
      UsernameAttributes: 
        - email
      Schema: 
        - AttributeDataType: String 
          Name: email 
          Required: true
        - AttributeDataType: String
          Mutable: true
          Name: address
          Required: true
        - AttributeDataType: String
          Mutable: true
          Name: birthdate
          Required: true
        - AttributeDataType: String
          Mutable: true
          Name: gender
          Required: true
        - AttributeDataType: String
          Mutable: true
          Name: family_name
          Required: true
        - AttributeDataType: String
          Mutable: true
          Name: given_name
          Required: true

```

Next, we need to create a Userpoolclient and associate it with the Userpool previously created.

```
  UserPoolClient:
    Type: AWS::Cognito::UserPoolClient 
    Properties: 
      ClientName: !Sub userpool-${TechStack}-${Env}
      UserPoolId: !Ref UserPool
      GenerateSecret: false
      SupportedIdentityProviders:
        - COGNITO
      CallbackURLs:
        - !Ref ClientDomain
      LogoutURLs:
        - !Ref ClientDomain
      AllowedOAuthFlowsUserPoolClient: true
      AllowedOAuthFlows:
        - implicit
      AllowedOAuthScopes:
        - email
        - openid
        - profile

```

And then create a Userpool domain that will be associated with the Userpool

```
  UserPoolDomain:
    Type: AWS::Cognito::UserPoolDomain
    Properties: 
      Domain: graphqlauth-car
      UserPoolId: !Ref UserPool

```

Think adding output for the SAM template.

```
Outputs:
  UserPoolId:
    Description: "User pool ID"
    Value: !Ref UserPool

  UserPoolClientId:
    Description: "Application client ID"
    Value: !Ref UserPoolClient

  AuthUrl:
    Description: "URL used for authentication"
    Value: !Sub https://${UserPoolDomain}.auth.${AWS::Region}.amazoncognito.com/login
  
  Issuer:
    Description: "Url used for issuer on HTTP API JWT tokens"
    Value: !Sub https://cognito-idp.${AWS::Region}.amazonaws.com/${UserPool}
```

## Car API

Now we are going to create a car API like for authentication , we need to create an app with `sam init`  At the top of the template file we are going to add the same configuration.

```
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  python-ecom-app

  Sample SAM Template for python-ecom-app


```

Next, we need to add some global configuration to our template, we will activate the tracing by default.

```
Globals:
  Api:
    TracingEnabled: True

```

After that define the parameters

Env :  The project environment (Dev, Prod, Staging, ... )

TechStack : In this case graphql

UserPoolId : The userpoolId that will be used to create the app syncs with cognito authorization

UserPoolIdRegion : The of the userpoolId

Now let's create the necessary resources

We are going to start with a role that will be assumed by Appsync

```
  AppSyncServiceRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: "Allow"
            Principal:
              Service:
                - "appsync.amazonaws.com"
            Action:
              - "sts:AssumeRole"
```

Now we can create our API. The API will have two kinds of authentication API KEY as a principal authentication mechanism and cognito as a second.

```
  CarApi:
    Type: "AWS::AppSync::GraphQLApi"
    Properties:
      Name: CarApi
      AuthenticationType: "API_KEY"
      AdditionalAuthenticationProviders:
        - AuthenticationType: "AMAZON_COGNITO_USER_POOLS"
          UserPoolConfig:
            UserPoolId: !Ref UserPoolId
            AwsRegion: !Ref UserPoolIdRegion
      XrayEnabled: true
```

Since we have defined API with an API key as an authentication method, we need to create an API KEY attached to it.

```
  CarApiKey:
    Type: AWS::AppSync::ApiKey
    Properties:
      ApiId: !GetAtt CarApi.ApiId

```

Next, let's define the graphQl schema for the API.

```
  CarApiSchema:
    Type: "AWS::AppSync::GraphQLSchema"
    Properties:
      ApiId: !GetAtt CarApi.ApiId
      DefinitionS3Location: ./schema.graphql
    Metadata:
      cfn-lint:
        config:
          ignore_checks:
            - W3002  # allow relative path in DefinitionS3Location

```

In the root of the car api project create a file schema.graphql and add the graphql schema.

```
schema {
    query: Query
    mutation: Mutation
}


type Query {
    # these are fields you can attach resolvers to (field: Query, field: getTodo)
    getCar(id: ID!): Car
    @aws_api_key @aws_cognito_user_pools

    getAllCars: [Car]
    @aws_api_key @aws_cognito_user_pools
}

type Mutation {

    createCar(input: CarInput): Car
    @aws_cognito_user_pools

    updateCar(input: CarUpdate): Car
    @aws_cognito_user_pools

    deleteCar(id: String!): String
    @aws_cognito_user_pools

}

type Car @aws_cognito_user_pools @aws_api_key {
    id: ID
    height: Float
    width: Float
    price: Float
    image_uri: String
    length: Float 
    description: String
    ownerId: String
}

type Rent @aws_cognito_user_pools @aws_api_key {
    id: ID
    car: Car
}

input CarInput @aws_cognito_user_pools {
    id: ID!
    height: Float!
    width: Float!
    price: Float!
    image_uri: String!
    length: Float!
    description: String!
    ownerId: String!
}

input CarUpdate @aws_cognito_user_pools {
    id: ID!
    height: Float
    width: Float
    price: Float
    image_uri: String
    length: Float
    description: String
    ownerId: String!
}
```

This graphql schema defines two queries `getCar(id: ID!): Car` and `getAllCars: [Car]` all of them accessible via API and cognito authentication `@aws_api_key @aws_cognito_user_pools` .

This graphql schema also has mutations. In this case, all of them are accessible only via cognito and The car model and inputs.

After creating the API Schema next we will create the dynamodb Table with attribute id as an id.

```
  CarTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub Car-${TechStack}-${Env}
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH 
      ProvisionedThroughput:
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5
```

The dynamodb Datasource is associated with the API.

```
  CarDataSource:
    Type: "AWS::AppSync::DataSource"
    Properties:
      ApiId: !GetAtt CarApi.ApiId
      Name: "CarDatascource"
      Type: "AMAZON_DYNAMODB"
      ServiceRoleArn: !GetAtt AppSyncServiceRole.Arn
      DynamoDBConfig:
        AwsRegion: !Ref "AWS::Region" 
        TableName: !Ref CarTable
```

Now it's time to create our javascript resolvers. Inside the src folder create another folder name handlers. then for each mutation and query create these files. `delete-item.mjs , get-all-items.mjs , get-by-id.mjs  , put-item.mjs , update-item.mjs`

In the `delete-item.mjs`  we are a javascript resolver to delete an item.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id } = ctx.arguments;
  return dynamodbDeleteRequest({ key: {id} });
}

export function response(ctx) {
  return ctx.result;
}


function dynamodbDeleteRequest({key}) {
  return {
    operation: 'DeleteItem',
    key: util.dynamodb.toMapValues(key),
  };
}
```

In the `get-all-items.mjs` we are going to create a javascript resolver to get all cars in the database.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return dynamodbGetRequest();
}

export function response(ctx) {
  return ctx.result.items;
}


function dynamodbGetRequest() {
  return {
    operation: 'Scan',
  };
}
```

In the `get-by-id.mjs` we are going to create a javascript resolver to get a car by his id.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id } = ctx.arguments;
  return dynamodbGetRequest({ key: {id} });
}

export function response(ctx) {
  return ctx.result;
}


function dynamodbGetRequest({key}) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues(key),
    consistentRead: true
  };
}
```

In the `put-item.mjs` we are going to create a javascript resolver to register a car.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id, ...values } = ctx.args.input;
  return dynamodbPutRequest({ key: {id}, values });
}

export function response(ctx) {
  return ctx.result;
}

function dynamodbPutRequest({key, values}) {
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues(key),
    attributeValues: util.dynamodb.toMapValues(values),
  };
}
```

In the update-item.mjs we are going to create a javascript resolver to update a car.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id, ...values }  = ctx.arguments.input;

  const condition = {
    id: { attributeExists: true },
  };
  return dynamodbUpdateRequest({ keys: { id }, values, condition });

}

export function response(ctx) {
  return ctx.result;
}


function dynamodbUpdateRequest(params) {
  const { keys, values, condition: inCondObj } = params;

  const sets = [];
  const removes = [];
  const expressionNames = {};
  const expValues = {};

  // Iterate through the keys of the values
  for (const [key, value] of Object.entries(values)) {
    expressionNames[`#${key}`] = key;
    if (value) {
      sets.push(`#${key} = :${key}`);
      expValues[`:${key}`] = value;
    } else {
      removes.push(`#${key}`);
    }
  }

  let expression = sets.length ? `SET ${sets.join(', ')}` : '';
  expression += removes.length ? ` REMOVE ${removes.join(', ')}` : '';

  const condition = JSON.parse(
    util.transform.toDynamoDBConditionExpression(inCondObj)
  );

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues(keys),
    condition,
    update: {
      expression,
      expressionNames,
      expressionValues: util.dynamodb.toMapValues(expValues),
    },
  };
}

```

Now in our template.yaml file we are going to configure these functions to use in a pipeline.

Each function configuration is attached to Appsync and the Datasource.

```
  CreateCarFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt CarApi.ApiId
      CodeS3Location: "./src/handlers/put-item.mjs"
      DataSourceName: !GetAtt CarDataSource.Name
      Description: "Creata a car"
      FunctionVersion: "2018-05-29"
      Name: "createcar"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

  UpdateCarFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt CarApi.ApiId
      CodeS3Location: "./src/handlers/update-item.mjs"
      DataSourceName: !GetAtt CarDataSource.Name
      Description: "Update a car"
      FunctionVersion: "2018-05-29"
      Name: "updatecar"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

  GetCarFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt CarApi.ApiId
      CodeS3Location: "./src/handlers/get-by-id.mjs"
      DataSourceName: !GetAtt CarDataSource.Name
      Description: "Get by id a car"
      FunctionVersion: "2018-05-29"
      Name: "getcar"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

  ListCarFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt CarApi.ApiId
      CodeS3Location: "./src/handlers/get-all-items.mjs"
      DataSourceName: !GetAtt CarDataSource.Name
      Description: "Get all cars"
      FunctionVersion: "2018-05-29"
      Name: "listcar"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

  DeleteCarFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt CarApi.ApiId
      CodeS3Location: "./src/handlers/delete-item.mjs"
      DataSourceName: !GetAtt CarDataSource.Name
      Description: "Delete car"
      FunctionVersion: "2018-05-29"
      Name: "deletecar"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

```

After creating the necessary function configuration we need to create resolvers that use these functions.

These functions are pipeline resolvers attached to Appsync and linked to one field either a mutation or query field.

```
  CreateCarResolver:
    Type: "AWS::AppSync::Resolver"
    Properties:
      ApiId: !GetAtt CarApi.ApiId
      TypeName: "Mutation"
      FieldName: "createCar"
      Kind: PIPELINE
      PipelineConfig:
        Functions: 
        - !GetAtt CreateCarFunction.FunctionId
      RequestMappingTemplate: "{}"
      ResponseMappingTemplate: "$util.toJson($context.result)"

  UpdateCarResolver:
    Type: "AWS::AppSync::Resolver"
    Properties:
      ApiId: !GetAtt CarApi.ApiId
      TypeName: "Mutation"
      FieldName: "updateCar"
      Kind: PIPELINE
      PipelineConfig:
        Functions: 
        - !GetAtt UpdateCarFunction.FunctionId
      RequestMappingTemplate: "{}"
      ResponseMappingTemplate: "$util.toJson($context.result)"

  GetCarResolver:
    Type: "AWS::AppSync::Resolver"
    Properties:
      ApiId: !GetAtt CarApi.ApiId
      TypeName: "Query"
      FieldName: "getCar"
      Kind: PIPELINE
      PipelineConfig:
        Functions: 
        - !GetAtt GetCarFunction.FunctionId
      RequestMappingTemplate: "{}"
      ResponseMappingTemplate: "$util.toJson($context.result)"

  ListCarResolver:
    Type: "AWS::AppSync::Resolver"
    Properties:
      ApiId: !GetAtt CarApi.ApiId
      TypeName: "Query"
      FieldName: "getAllCars"
      Kind: PIPELINE
      PipelineConfig:
        Functions: 
        - !GetAtt ListCarFunction.FunctionId
      RequestMappingTemplate: "{}"
      ResponseMappingTemplate: "$util.toJson($context.result)"

  DeleteCarResolver:
    Type: "AWS::AppSync::Resolver"
    Properties:
      ApiId: !GetAtt CarApi.ApiId
      TypeName: "Mutation"
      FieldName: "deleteCar"
      Kind: PIPELINE
      PipelineConfig:
        Functions: 
        - !GetAtt DeleteCarFunction.FunctionId
      RequestMappingTemplate: "{}"
      ResponseMappingTemplate: "$util.toJson($context.result)"

  GetCarByRentResolver:
    Type: "AWS::AppSync::Resolver"
    Properties:
      ApiId: !GetAtt CarApi.ApiId
      TypeName: "Query"
      FieldName: "getCarByRent"
      Kind: PIPELINE
      PipelineConfig:
        Functions: 
        - !GetAtt GetCarByRentFunction.FunctionId
      RequestMappingTemplate: "{}"
      ResponseMappingTemplate: "$util.toJson($context.result)"

```

And then we will create the dynamoDB policy to allow Appsync to perform actions on dynamodb.

```
  DynamoDBPolicy:
    Type: "AWS::IAM::Policy"
    Properties:
      PolicyName: "DirectAppSyncLambda"
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: "Allow"
            Action: "dynamodb:*"
            Resource:
              - !GetAtt CarTable.Arn
      Roles:
        - !Ref AppSyncServiceRole
```

## Rent API

Now we are going to create a rent API , we need to create an app with `sam init`  At the top of the template file we are going to add the same configuration.

```
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  rent-app

  Sample SAM Template for python-ecom-app


```

Next, we need to add some global configuration to our template, we will activate the tracing by default.

```
Globals:
  Api:
    TracingEnabled: True

```

After that define the parameters

Env :  The project environment (Dev, Prod, Staging, ... )

TechStack : In this case graphql

UserPoolId : The userpoolId that will be used to create the app syncs with cognito authorization

UserPoolIdRegion : The of the userpoolId

Now let's create the necessary resources

We are going to start with a role that will be assumed by Appsync

```
  AppSyncServiceRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: "Allow"
            Principal:
              Service:
                - "appsync.amazonaws.com"
            Action:
              - "sts:AssumeRole"
```

Now we can create our API. The API will have two kinds of authentication API KEY as a principal authentication mechanism and cognito as a second.

```
span
```

Since we have defined API with an API key as an authentication method, we need to create an API KEY attached to it.

```
  RentApiKey:
    Type: AWS::AppSync::ApiKey
    Properties:
      ApiId: !GetAtt RentApi.ApiId

```

Next, let's define the graphQl schema for the API.

```
  RentApiSchema:
    Type: "AWS::AppSync::GraphQLSchema"
    Properties:
      ApiId: !GetAtt RentApi.ApiId
      DefinitionS3Location: ./schema.graphql
    Metadata:
      cfn-lint:
        config:
          ignore_checks:
            - W3002  # allow relative path in DefinitionS3Location

```

In the root of the car api project create a file schema.graphql and add the graphql schema.

```
schema {
    query: Query
    mutation: Mutation
}


type Query {
  
    getRent(id: ID!): Rent
    @aws_api_key @aws_cognito_user_pools

    getAllRents: [Rent]
    @aws_api_key @aws_cognito_user_pools

}

type Mutation {

    createRent(input: RentInput): Rent
    @aws_cognito_user_pools

    updateRent(input: RentUpdate): Rent
    @aws_cognito_user_pools

    deleteRent(id: String!): String
    @aws_cognito_user_pools

}

type Rent @aws_cognito_user_pools @aws_api_key {
    id: ID
    rentDate: AWSDate
    dueDate: AWSDate
    carId: String
    ownerId: String
}


input RentInput @aws_cognito_user_pools {
    id: ID!
    rentDate: AWSDate!
    dueDate: AWSDate!
    carId: String!
    ownerId: String!
}

input RentUpdate @aws_cognito_user_pools {
    id: ID!
    rentDate: AWSDate!
    dueDate: AWSDate!
    carId: String!
    ownerId: String!
}
```

This graphql schema defines two queries `getRent(id: ID!): Car` and `getAllRents: [Car]` all of them accessible via API and cognito authentication `@aws_api_key @aws_cognito_user_pools` .

This graphql schema also has mutations. In this case, all of them are accessible only via cognito and The car model and inputs.

After creating the API Schema next we will create the dynamodb Table with attribute id as an id.

```
span
```

The dynamodb Datasource is associated with the API.

```
span
```

Now it's time to create our javascript resolvers. Inside the src folder create another folder name handlers. then for each mutation and query create these files. `delete-item.mjs , get-all-items.mjs , get-by-id.mjs  , put-item.mjs , update-item.mjs`

In the `delete-item.mjs`  we are a javascript resolver to delete an item.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id } = ctx.arguments;
  return dynamodbDeleteRequest({ key: {id} });
}

export function response(ctx) {
  return ctx.result;
}


function dynamodbDeleteRequest({key}) {
  return {
    operation: 'DeleteItem',
    key: util.dynamodb.toMapValues(key),
  };
}
```

In the `get-all-items.mjs` we are going to create a javascript resolver to get all cars in the database.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return dynamodbGetRequest();
}

export function response(ctx) {
  return ctx.result.items;
}


function dynamodbGetRequest() {
  return {
    operation: 'Scan',
  };
}
```

In the `get-by-id.mjs` we are going to create a javascript resolver to get a car by his id.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id } = ctx.arguments;
  return dynamodbGetRequest({ key: {id} });
}

export function response(ctx) {
  return ctx.result;
}


function dynamodbGetRequest({key}) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues(key),
    consistentRead: true
  };
}
```

In the `put-item.mjs` we are going to create a javascript resolver to register a car.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id, ...values } = ctx.args.input;
  return dynamodbPutRequest({ key: {id}, values });
}

export function response(ctx) {
  return ctx.result;
}

function dynamodbPutRequest({key, values}) {
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues(key),
    attributeValues: util.dynamodb.toMapValues(values),
  };
}
```

In the update-item.mjs we are going to create a javascript resolver to update a car.

```
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id, ...values }  = ctx.arguments.input;

  const condition = {
    id: { attributeExists: true },
  };
  return dynamodbUpdateRequest({ keys: { id }, values, condition });

}

export function response(ctx) {
  return ctx.result;
}


function dynamodbUpdateRequest(params) {
  const { keys, values, condition: inCondObj } = params;

  const sets = [];
  const removes = [];
  const expressionNames = {};
  const expValues = {};

  // Iterate through the keys of the values
  for (const [key, value] of Object.entries(values)) {
    expressionNames[`#${key}`] = key;
    if (value) {
      sets.push(`#${key} = :${key}`);
      expValues[`:${key}`] = value;
    } else {
      removes.push(`#${key}`);
    }
  }

  let expression = sets.length ? `SET ${sets.join(', ')}` : '';
  expression += removes.length ? ` REMOVE ${removes.join(', ')}` : '';

  const condition = JSON.parse(
    util.transform.toDynamoDBConditionExpression(inCondObj)
  );

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues(keys),
    condition,
    update: {
      expression,
      expressionNames,
      expressionValues: util.dynamodb.toMapValues(expValues),
    },
  };
}

```

Now in our template.yaml file we are going to configure these functions to use in a pipeline.

Each function configuration is attached to Appsync and the Datasource.

```
  CreateRentFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt RentApi.ApiId
      CodeS3Location: "./src/handlers/put-item.mjs"
      DataSourceName: !GetAtt RentDataSource.Name
      Description: "Creata a Rent"
      FunctionVersion: "2018-05-29"
      Name: "createRent"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0
  
  UpdateRentFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt RentApi.ApiId
      CodeS3Location: "./src/handlers/update-item.mjs"
      DataSourceName: !GetAtt RentDataSource.Name
      Description: "Update a Rent"
      FunctionVersion: "2018-05-29"
      Name: "updateRent"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

  GetRentFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt RentApi.ApiId
      CodeS3Location: "./src/handlers/get-by-id.mjs"
      DataSourceName: !GetAtt RentDataSource.Name
      Description: "Get by id a Rent"
      FunctionVersion: "2018-05-29"
      Name: "getRent"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

  ListRentFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt RentApi.ApiId
      CodeS3Location: "./src/handlers/get-all-items.mjs"
      DataSourceName: !GetAtt RentDataSource.Name
      Description: "Get all Rents"
      FunctionVersion: "2018-05-29"
      Name: "listRent"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

  DeleteRentFunction:
    Type: AWS::AppSync::FunctionConfiguration
    Properties: 
      ApiId: !GetAtt RentApi.ApiId
      CodeS3Location: "./src/handlers/delete-item.mjs"
      DataSourceName: !GetAtt RentDataSource.Name
      Description: "Delete Rent"
      FunctionVersion: "2018-05-29"
      Name: "deleteRent"
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0
```

After creating the necessary function configuration we need to create resolvers that use these functions.

These functions are pipeline resolvers attached to Appsync and linked to one field either a mutation or query field.

```
span
```

And then we will create the dynamoDB policy to allow Appsync to perform actions on dynamodb.

```
  DynamoDBPolicy:
    Type: "AWS::IAM::Policy"
    Properties:
      PolicyName: "DirectAppSyncLambda"
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: "Allow"
            Action: "dynamodb:*"
            Resource:
              - !GetAtt RentTable.Arn
      Roles:
        - !Ref AppSyncServiceRole

```

## Merged API

Now it's time to merge our apis (Car, Rent). We need to create another SAM project with the same command `sam init`. at the top of the file put the configuration.

```
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  merged-api

  Sample SAM Template for merged-api

```

Next, we need to add parameters.

We need the Car API id, Rent Api id, Userpool Id, and Userpool region as parameters.

```
Parameters:
  CarApiId:
    Type: String
    Description: Car appsync Api Id
  RentApiId:
    Type: String
    Description: Rent appsync Api Id
  UserPoolId:
    Type: String
    Description: User pool Id
  UserPoolIdRegion:
    Type: String
    Description: User pool id region

```

Now let's create resources the first resource we need to create is a role that will be assumed by Appsync and the necessary permission to the merged apis.

```
  AppSyncServiceRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: "Allow"
            Principal:
              Service:
                - "appsync.amazonaws.com"
            Action:
              - "sts:AssumeRole"
      Policies:
      - PolicyName: MergedAPiPermission
        PolicyDocument:
          Version: 2012-10-17
          Statement:
            - Effect: Allow
              Action:
                - 'appsync:AssociateSourceGraphqlApi'
                - 'appsync:StartSchemaMerge'
                - 'appsync:SourceGraphQL'
              Resource: "*"

```

Next, we need to create our Appsync merge API.

```
  MergeAppSyncApi:
    Type: AWS::AppSync::GraphQLApi
    Properties:
      ApiType: MERGED
      AuthenticationType: API_KEY
      MergedApiExecutionRoleArn: !GetAtt AppSyncServiceRole.Arn
      AdditionalAuthenticationProviders:
        - AuthenticationType: "AMAZON_COGNITO_USER_POOLS"
          UserPoolConfig:
            UserPoolId: !Ref UserPoolId
            AwsRegion: !Ref UserPoolIdRegion
      Name: MergeCarApi
      XrayEnabled: true
```

We need to create our api key.

```
  MergedApiKey:
    Type: AWS::AppSync::ApiKey
    Properties:
      ApiId: !GetAtt MergeAppSyncApi.ApiId

```

After that, we need to associate our APIs with the merged API.

```
  CarAPIAssociation:
    Type: AWS::AppSync::SourceApiAssociation
    Properties: 
      Description: Car api association
      MergedApiIdentifier: !GetAtt MergeAppSyncApi.ApiId
      SourceApiAssociationConfig: 
        MergeType: AUTO_MERGE
      SourceApiIdentifier: !Ref CarApiId

  RentAPIAssociation:
    Type: AWS::AppSync::SourceApiAssociation
    Properties: 
      Description: Rent api association
      MergedApiIdentifier: !GetAtt MergeAppSyncApi.ApiId
      SourceApiAssociationConfig: 
        MergeType: AUTO_MERGE
      SourceApiIdentifier: !Ref RentApiId
```

And finally the output.

```
Outputs:
  GraphQLApiEndpoint:
    Description: The URL to the GraphQL Endpoint
    Value: !GetAtt MergeAppSyncApi.GraphQLUrl
  APIKey:
    Description: API Key for using the GraphQL endpoint. (header key name 'x-api-key')
    Value: !GetAtt MergedApiKey.ApiKey
```
