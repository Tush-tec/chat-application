import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser, registerUser } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { LocalStorage, requestHandler } from '../utils';
import Loader from '../component/Loader';

// Create a context to manage authentication-related data and functions
const AuthContext = createContext({
  user: null,
  token: null,
  register: async () => {},
  login: async () => {},
  logout: async () => {},
});

// Create a hook to access the AuthContext
const useAuth = () => {
  return useContext(AuthContext); // useContext should be used inside a functional component or hook
};

// Create a component that provides authentication-related data and functions
const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const navigate = useNavigate();

  const register = async (data) => {
    await requestHandler(
      async () => await registerUser(data),
      setIsLoading,
      () => {
        alert("Account Created Successfully! Go ahead and Login.");
        navigate('/login');
      },
     (error)=>{
      console.error("Register failed:", error.message || error);
     }
    );
  };

  const login = async (data) => {
    await requestHandler(
      async () => await loginUser(data),
      setIsLoading,
      (res) => {
        const { data } = res;
        console.log('Login response:', data); // Debugging statement
        setUser(data.user);
        setToken(data.accessToken);
        LocalStorage.set('User', data.user);
        LocalStorage.set('Token', data.accessToken);
        navigate('/chat');
      },
      (error) => {
        console.error("Login failed", error.message || error)
      }
    );
  };

  const logout = async () => {
    await requestHandler(
      async () => await logoutUser(),
      setIsLoading,
      () => {
        setUser(null);
        setToken(null);
        LocalStorage.clear();
        navigate('/login');
      },
      (error)=>{
        console.error("Log-out failed:", error.message || error);
       }
    );
  };

  // console.log(LocalStorage.get())

  useEffect(() => {
    const getToken = LocalStorage.get('Token'); // Token is saved with this key, not 'token'
    const getUser = LocalStorage.get('User'); // User is saved with this key, not 'user'

    if (getToken && getUser && getUser._id) {
      setToken(getToken);
      setUser(getUser);
    }

    setIsLoading(false);
  }, []);


  return (
    <AuthContext.Provider value={{ user, token, register, login, logout }}>
      {isLoading ? <Loader /> : children} 
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider, useAuth };
