const express = require('express')
const cors =require('cors')
const dotenv = require('dotenv')
dotenv.config();
const app = express()
const port = process.env.port || 5000

// Middleware--
app.use(cors())
app.use(express.json())

// sample route
app.get('/',(req, res)=>{
    res.send('Pet Care server is running')
})

// start the server---
app.listen(port,()=>{
    console.log(`Server is listening on port ${port}`);
});