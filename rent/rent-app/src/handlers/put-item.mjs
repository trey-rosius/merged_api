import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id, ...values } = ctx.args.input;
  return dynamodbPutRequest({ key: {id}, values });
}

export function response(ctx) {
  return ctx.result;
}

/**
 * Helper function to create a new item
 * @returns a PutItem request
 */
function dynamodbPutRequest({key, values}) {
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues(key),
    attributeValues: util.dynamodb.toMapValues(values),
  };
}