const {
redisClient
}=require("../config/redis");



async function publishMessage(
channel,
data
){

await redisClient.publish(
channel,
JSON.stringify(data)
);


}



async function subscribeMessage(
channel,
callback
){


const subscriber=
redisClient.duplicate();



await subscriber.connect();



await subscriber.subscribe(
channel,
(message)=>{


callback(
JSON.parse(message)
);


});


}



module.exports={
publishMessage,
subscribeMessage
};