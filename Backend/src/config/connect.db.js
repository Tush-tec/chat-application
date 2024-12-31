import mongoose from "mongoose";

const connectToDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/exhaustionGram`)
        console.log(`\n mongodb Connected !! DB HOST : ${connectionInstance.connection.host} `);

    } catch (error) {
        console.error("MonogDb Connection Error",    error)
        process.exit(1)        
        
    }
}  

export default connectToDB