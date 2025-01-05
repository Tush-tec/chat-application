import React from 'react'

const Input = (props) => {
  return (
    <input
    {...props}
    className={`block w-full rounded-xl outline outline-[1px] outline-zinc-400 border-0 py-4 px-5 bg-secondary text-dark-800 font-light placeholder:text-dark-100 ${
        props.className || ""
      }`}
    />
  )
}

export default Input