import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id } = ctx.arguments;
  return dynamodbGetRequest({ key: {id} });
}

export function response(ctx) {
  return ctx.result;
}

/**
 * Helper function to create a new item
 * @returns a PutItem request
 */
function dynamodbGetRequest({key}) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues(key),
    consistentRead: true
  };
}