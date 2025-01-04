import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LockClosedIcon } from "@heroicons/react/20/solid";
import Input from '../component/Input';
import { Button } from '@headlessui/react';

const Login = () => {
  const [userLogin, setUserLogin] = useState({
    userName:"",
    password:""
  })

  const {login} = useAuth()

  const handleOnChange = (e) =>{
    const {name, value} = e.target // Extract name and value from the event. 

    setUserLogin({
      ...userLogin,
      [name]:value
    })
  }

  const handleLogin = async () =>  await login(userLogin)
  
  return (
    <div className="flex justify-center items-center flex-col h-screen w-screen">
    <h1 className="text-3xl font-bold">FreeAPI Chat App</h1>
    <div className="max-w-5xl w-1/2 p-8 flex justify-center items-center gap-5 flex-col bg-dark shadow-md rounded-2xl my-16 border-secondary border-[1px]">
      <h1 className="inline-flex items-center text-2xl mb-4 flex-col">
        <LockClosedIcon className="h-8 w-8 mb-2" /> Login
      </h1>
      {/* Input for entering the username */}
      <Input
        placeholder="Enter the username..."
        name="userName"
        value={userLogin.userName}
        onChange={handleOnChange}
      />
      {/* Input for entering the password */}
      <Input
        placeholder="Enter the password..."
        name="password"
        type="password"
        value={userLogin.password}
        onChange={handleOnChange}
      />
      {/* Button to initiate the login process */}
      <Button
        disabled={Object.values(userLogin).some((val) => !val)}
        fullWidth
        onClick={handleLogin}
      >
        Login
      </Button>
      {/* Link to the registration page */}
      <small className="text-zinc-300">
        Don&apos;t have an account?{" "}
        <a className="text-primary hover:underline" href="/register">
          Register
        </a>
      </small>
    </div>
  </div>
)}

export default Login