import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload Function
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("No file path provided.");
    }

    // Upload file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Handles images, videos, etc.
    });

    console.log("File uploaded to Cloudinary:", response.url);

    // Cleanup local file after successful upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error.message || error);

    // Cleanup local file even if the upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null; // Return null on failure
  }
};

export { uploadOnCloudinary };

// import { v2 as cloudinary } from 'cloudinary';
// import fs from  "fs"


//     cloudinary.config({ 
//         cloud_name: process.env. CLOUDINARY_CLOUD_NAME, 
//         api_key: process.env.CLOUDINARY_API_KEY ? "Loaded" : "Missing",
//         api_secret: process.env.CLOUDINARY_API_SECRET ? "Loaded" : "Missing",
//     });
    
// const uploadOnCloudinary =  async (localFilePath) =>{
//     try {
    
//         if(!localFilePath) return null
//           const localFieldResponse = await cloudinary.uploader.upload(localFilePath, {
//             resource_type:'auto'
//            })

//          console.log("file is  upload on cloudinary",localFieldResponse.url);  
//          return localFieldResponse;

//     } catch (error) {
//         console.error("Cloudinary upload error:", error.message || error);
//        fs.unlinkSync(localFilePath) 
//     return null   
//     }
// }

// export {uploadOnCloudinary}




