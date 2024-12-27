import express, { urlencoded } from 'express'
import dotenv from 'dotenv'
import connectToDB from './config/connect.db'
import cookieParser from 'cookie-parser'
import cors from 'cors'


const app = express()
app.use(cors(
    {
        origin:process.env.CORS,
        credentials:true
    }
))

app.use(express.json())
app.use(urlencoded({extended:true}))
app.use(cookieParser())


