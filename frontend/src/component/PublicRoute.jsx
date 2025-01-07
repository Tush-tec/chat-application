import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const PublicRoute = ({ children }) => {

  const { token, user } = useAuth()

  // If authenticated, redirect to '/chat'
  if (token && user?._id) {
    return <Navigate to='/chat' replace />
  } 
  if (!children) {
    console.error("PrivateRoute requires children components to render.");
    return null;
  }
  // If not authenticated, render the children
  return children
}

export default PublicRoute
