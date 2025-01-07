import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const { token, user } = useAuth();

  if (!token || !user?._id) {
    return <Navigate to="/login" replace />;
  }

  // if (!children) {
  //   console.error("PrivateRoute requires children components to render.");
  //   return null;
  // }

  return children;
};

export default PrivateRoute 
