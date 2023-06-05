import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id } = ctx.arguments;
  return dynamodbDeleteRequest({ key: {id} });
}

export function response(ctx) {
  return ctx.result;
}

/**
 * Helper function to create a new item
 * @returns a PutItem request
 */
function dynamodbDeleteRequest({key}) {
  return {
    operation: 'DeleteItem',
    key: util.dynamodb.toMapValues(key),
  };
}