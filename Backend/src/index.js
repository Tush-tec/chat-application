import connectToDB from "./config/connect.db.js";
import { app } from "./app.js";

connectToDB()
.then(()=>{
    app.listen(process.env.PORT, () =>{
        console.log(`Server is running on port ${process.env.PORT}`);
    })
})
.catch((err) =>{
    console.log("Mongo connection is failed!",err);
    
})