export function request(ctx) {
  return {
      operation: 'GetItem',
      key: {
          id: {
              'S': ctx.source.rentId
          }
      }
  }
}

export function response(ctx) {
  if (ctx.error) {
      util.error(ctx.error.message, ctx.error.type, ctx.result)
  }
  
  return ctx.result
}