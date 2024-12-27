import express from 'express'


const app = express()


app.get('/',(req,res) =>{
    res.send('Hello we are going to make a server for chat application.') 
})




app.listen(6080,()=>{
    console.log("Server is listening on port : 6080");
    
})