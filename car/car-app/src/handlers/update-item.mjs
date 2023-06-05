import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id, ...values }  = ctx.arguments.input;
  // return dynamodbUpdateRequest({ key: {id}, values });

  // const { args: { input: { id, ...values } } } = ctx;

  const condition = {
    id: { attributeExists: true },
  };
  return dynamodbUpdateRequest({ keys: { id }, values, condition });

}

export function response(ctx) {
  return ctx.result;
}

/**
 * Helper function to create a new item
 * @returns a PutItem request
 */
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
// function dynamodbUpdateRequest({key, values}) {
//   return {
//     operation: 'UpdateItem',
//     key: util.dynamodb.toMapValues(key),
//     update: {
//         expression: 'SET height = :height, width = :width, price = :price, image_uri = :image_uri, lenght = :length, description = :description, ownerId = :ownerId',
//         expressionValues: { 
//             ':height': { N: values.height },
//             ':width' : { N: values.width },
//             ':price' : { N: values.price},
//             'image_uri': { S: values.image_uri},
//             'length': { N: values.length },
//             'description': { S: values.description},
//             'ownerId': { S: values.ownerId }
//          },
//       },
//   };
// }