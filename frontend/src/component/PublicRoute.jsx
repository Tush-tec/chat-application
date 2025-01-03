import React, { Children } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const PublicRoute = ({Children}) => {

    const {token, user} = useAuth

    if(token && user?._id) {
        return <Navigate to='/chat' replace/>
    } else {
        return <Navigate to='/login' replace/>
    }

    
  return Children
}

export default PublicRoute