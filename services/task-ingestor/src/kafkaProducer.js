const {Kafka} = require(kafkajs);

const kafka = new Kafka({
    clientID: 'task-ingestor',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092',]
})

const producer = kafka.producer();

async function connectProducer (){
    try {
        await producer.connect();
        console.log("kafka producer connected");
    } catch(err) {
        console.error("failed to connect kafka producer");
        process.exit(1);
    }
}

async function sendTask(task) {
    try{
        await producer.send({
            topic: process.env.KAFKA_TOPIC || 'tasks',
            messages: [
                {value: JSON.stringify(task)}
            ],
        });
        console.log('Task sent to kafka :', task);
    }
    catch(err) {
         console.error('❌ Error sending task to Kafka:', err);
        throw err;
    }
}

module.exports = {
    kafkaProducer : {
        connectProducer , 
        sendTask
    }
}