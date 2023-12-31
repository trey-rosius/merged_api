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