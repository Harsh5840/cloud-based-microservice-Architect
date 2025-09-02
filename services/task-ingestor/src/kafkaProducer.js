const {kafka} = require(kafkajs);

const kafka = new kafka({
    clientID: 'task-ingestor',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092',]
})

