import mongoose from "mongoose"

const connect = async () => {
    try {
        const result = await mongoose.connect(process.env.DB_URL)
        if(result){
            console.log("Database is connected");
        }
    } catch (error) {
        console.log(`Database is not connected: ${error}` );
    }
}
export default connect

