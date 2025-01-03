import React from 'react'

const Button = ({
    fullwidth = false,
    severity = "primary",
    size = base,
    className = "",
    children,
    ...props

}) => {
    const classes = className(
        "rounded-full  inline-flex flex-shrink-0 justify-center items-center text-center text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-sm",
        fullwidth ? "w-full" : "",
        severity === "primary"
        ? "bg-blue-500 hover:bg-blue-700" : "",
        severity === "secondary"
        ? "bg-secondary hover:bg-secondary/80 disabled:bg-secondary/50 outline outline-[1px] outline-zinc-400" : severity === "danger"
        ? "bg-danger hover:bg-danger/80 disabled:bg-danger/50" : "bg-primary hover:bg-primary/80 disabled:bg-primary/50",
        severity === "success" ? "bg-green-500 hover:bg-green-700" : "",
        severity === "error" ? "bg-red-500 hover:bg-red-700" : "",
        size === "small" ? "text-sm px-3 py-1.5" : "text-base px-4 py-3",
        className
    )
  return (
    <button {...props} className={classes}>
        {children}
    </button>
  )
}

export default Button

