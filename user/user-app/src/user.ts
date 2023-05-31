// import AWS from "aws-sdk"




export async function post_authentication_handler(event: Event, context: any)  {

    console.log(event)

    // a lambda function that subscribe to a sns topic


    // const sns = new AWS.SNS({apiVersion: '2010-03-31'});
    // const email = event['request']['userAttributes']['email']

    // const policy = JSON.stringify({
    //     "detail": {
    //         "email": [email] 
    //     }
        
    // })



    // var params = {
    //     Protocol: 'email', /* required */
    //     TopicArn: process.env.SNS_TOPIC_ARN , /* required */
    //     Attributes: {
    //         "FilterPolicy": policy,
    //         "FilterPolicyScope": "MessageBody"
    //     },
    //     Endpoint: email,
    //     ReturnSubscriptionArn: true || false
    //   };
    //   sns.subscribe(params, function(err, data) {
    //     if (err) console.log(err, err.stack); // an error occurred
    //     else     console.log(data);           // successful response
    //   });
  
  
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully subscribed to topic.",
      }),
    };
}
