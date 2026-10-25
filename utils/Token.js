const sendToken = (user, statusCode, res) => {
    const token = user.jsonWebToken()
    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true
    }
    return res.status(statusCode).cookie("token", token, options).json({
        success: true,
        token,
        user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    })
}

export default sendToken