import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return dynamodbGetRequest();
}

export function response(ctx) {
  return ctx.result.items;
}

/**
 * Helper function to create a new item
 * @returns a PutItem request
 */
function dynamodbGetRequest() {
  return {
    operation: 'Scan',
  };
}