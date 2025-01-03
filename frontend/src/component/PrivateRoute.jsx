import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

// Define a PrivateRoute component that wraps child components to ensure user authentication
const PrivateRoute = ({ children }) => {
  // Destructure token and user details from the authentication context
  const { token, user } = useAuth();

  // If there's no token or user ID, redirect to the login page
  if (!token || !user?._id) {
    return <Navigate to="/login" replace />;
  }
  // If authenticated, render the child components
  return children;
};

export default PrivateRoute;
