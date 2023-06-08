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