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