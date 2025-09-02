
const express = require('express');
const bodyParser = require('body-parser');
const {kafkaProducer} = require('./kafkaProducer');
const {validateTask} = require('./taskValidator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

app.get('/health' , (req,res)=>{
    res.json({status : 'Task Ingestor service is healthy'});
})

app.post('/task' , async(req,res)=>{
    const task = req.body;

    const {valid , error} = validateTask(task);
    if(!valid) {
        return res.status(400).json({success : false , error});
    }

    try{
        //sending to kafka
        await kafkaProducer.sendTask(task);
         return res.status(200).json({ success: true, message: 'Task ingested successfully' });
    } catch (err) {
        console.error('Error sending task to Kafka:', err);
        return res.status(500).json({ success: false, error: 'Failed to ingest task' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Task Ingestor service running on port ${PORT}`);
});
    