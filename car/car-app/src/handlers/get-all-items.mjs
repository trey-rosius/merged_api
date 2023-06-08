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