const userModel = require('../models/userModel')
const jwt = require('jsonwebtoken')
const { isValid, isValidObjectId, isValidString, isValidNum } = require('../utils/validation')

const authentication = async function (req, res, next) {
    try {
        let token = req.rawHeaders[1].split(" ")[1]
        if (!token) return res.status(401).send({ status: false, message: "You are not Authenticated" })
        let decodedToken = await jwt.verify(token, "e-commerceWebsite")
        req.decodedUserId = decodedToken.userId
        next()
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

const authorization = async function (req, res, next) {
    try {
        const userId = req.params.userId
        const decodedUserId = req.decodedUserId
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "Invalid user Id" })
        if (! await userModel.findOne({ _id: userId })) return res.status(404).send({ status: false, message: "User not found" })
        if (userId != decodedUserId) return res.status(403).send({ status: false, message: "You are not Authorized" })
        next()
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}


module.exports = { authentication, authorization }