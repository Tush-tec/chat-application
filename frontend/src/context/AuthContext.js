import React from 'react'
import { createContext, useContext, useState, useEffect } from 'react'
import { loginUser, logoutUser, registerUser } from '../api/api'
import {data, useNavigate} from 'react-router-dom'
import { LocalStorage, requestHandler } from '../utils'


// Create a context to manage authentication-related data and functions

const AuthContext = createContext({
    user: null,
    token:null,
    register:async () => {},
    login: async () => {},
    logout: async() => {}
})

// Create a hook to access the AuthContext
const useAuth = useContext(AuthContext)

// Create a component that provides authentication-related data and functions
const AuthProvider = ({children}) => {

    const [isLoading, setIsLoading] = useState(false)
    const [user,setUser] = useState(null)
    const [token, setToken] = useState(null)

    const navigate = useNavigate()

    const register = async (data) => {

        await requestHandler(
            async()=> await registerUser(data),
            setIsLoading,
            () => {
                alert("Account Created SuccessFully! Go Ahead and Login")
                navigate('/login')
            },
            alert
        )
    }

    const login = async (data) => {
        await  requestHandler(
            async () => await loginUser(data),
            setIsLoading,
            (res) => {
                const {data} = res
                setUser(data.user)
                setToken(data.accessToken)
                LocalStorage.set("User", data.user)
                LocalStorage.set("Token", data.accessToken)
                navigate('/chat ')
            },
            alert 
        )
    }

    const logout = async () => {
        await requestHandler(
            async () => await logoutUser(),
            setIsLoading,
            () => {
                setUser(null)
                setToken(null)
                LocalStorage.clear()
                navigate('/login')
            },
            alert 
        )
    }

    useEffect(() => {

        const getToken = LocalStorage.get("token")
        const getUser = LocalStorage.get("user")

        if(getToken && getUser && getUser._id) {
            setToken(getToken)
            setUser(getUser)
        }
        setIsLoading(false)

    },[])

    // Provide authentication-related data and functions through the context

    return (
        <AuthContext.Provider value={{user, token, register, login, logout}}>
            {isLoading ? <Loader /> : children} {/* Display a loader while loading */}
        </AuthContext.Provider>
    )

}


export {
    AuthContext, AuthProvider,useAuth
}