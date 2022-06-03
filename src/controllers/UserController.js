const userModel = require('../models/userModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const axios = require("axios");
const { uploadFile } = require('../utils/aws')
const { isValid, isValidBody, isValidString, isValidMobileNum, isValidEmail, isValidPwd, isValidObjectId} = require('../utils/validation')

const createUser = async function (req, res) {
    try {
        let requestBody = req.body
        let files = req.files
        if (!isValidBody(requestBody)) return res.status(400).send({ status: false, msg: "provide details" })

        let { fname, lname, email, phone, password, address } = requestBody
        if (!isValid(fname)) return res.status(400).send({ status: false, message: "fname is mandatory" })
        if (!isValidString(fname)) return res.status(201).send({ status: false, message: "fname should not contain number" })

        if (!isValid(lname)) return res.status(400).send({ status: false, message: "lname is mandatory" })
        if (!isValidString(lname)) return res.status(400).send({ status: false, message: "lname should not contain number" })

        if (!isValid(email)) return res.status(400).send({ status: false, message: "email is mandatory" })
        if (!isValidEmail(email)) return res.status(400).send({ status: false, message: "email not valid" })
        let uniqueEmail = await userModel.findOne({email:email})
        if(uniqueEmail) return res.status(400).send({ status: false, message: "email Id already exist" })

        if (!isValid(phone)) return res.status(400).send({ status: false, message: "phone is mandatory" })
        if (!isValidMobileNum(phone)) return res.status(400).send({ status: false, message: "phone not valid" })
        let uniquephone = await userModel.findOne({phone:phone})
        if(uniquephone) return res.status(400).send({ status: false, message: "phone no. already exist" })


        if (!isValid(password)) return res.status(400).send({ status: false, message: "password is mandatory" })
        if (!isValidPwd(password)) return res.status(400).send({ status: false, message: "password not valid..password length bw 8-15 and one special char and 1 uppercase " })

        const bcryptPassword = await bcrypt.hash(password, 10)
        requestBody.password = bcryptPassword

        if (!address) return res.status(400).send({ status: false, message: "address is mandatory" })
        address = JSON.parse(address)

        let { shipping, billing } = address

        if (!shipping) return res.status(400).send({ status: false, message: "shipping address is mandatory" })
        else {
            let { street, city, pincode } = shipping
            if (!street) return res.status(400).send({ status: false, message: "shipping street is mandatory" })
            if (!city) return res.status(400).send({ status: false, message: "shipping city is mandatory" })
            if (!pincode) return res.status(400).send({ status: false, message: "shipping pincode is mandatory" })
            let options = {
                method: "GET",
                url: `https://api.postalpincode.in/pincode/${pincode}`
            }
            let result = await axios(options)
            if (!result.data[0].PostOffice) return res.status(400).send({ status: false, message: "No city Found with provided pincode" })
            const cityByPincode = result.data[0].PostOffice[0].District
            if (city.toLowerCase() !== cityByPincode.toLowerCase()) return res.status(400).send({ status: false, message: "Provided Pincode city is different" })
        }

        if (!billing) return res.status(400).send({ status: false, message: "billing address is mandatory" })
        else {
            let { street, city, pincode } = billing
            if (!street) return res.status(400).send({ status: false, message: "billing street is mandatory" })
            if (!city) return res.status(400).send({ status: false, message: "billing city is mandatory" })
            if (!pincode) return res.status(400).send({ status: false, message: "billing pincode is mandatory" })
            let options = {
                method: "GET",
                url: `https://api.postalpincode.in/pincode/${pincode}`
            }
            let result = await axios(options)
            if (!result.data[0].PostOffice) return res.status(400).send({ status: false, message: "No city Found with provided pincode" })
            const cityByPincode = result.data[0].PostOffice[0].District
            if (city.toLowerCase() !== cityByPincode.toLowerCase()) return res.status(400).send({ status: false, message: "Provided Pincode city is different" })
        }

        if (files && files.length != 0) {
            let imageUrl = await uploadFile(files[0])
             if (!imageUrl) return res.status(400).send({ status: false, message: "profile image is mandatory" })
             requestBody.profileImage = imageUrl
        }

        requestBody.address = address
        
        let userCreated = await userModel.create(requestBody)
        return res.status(201).send({ status: true, message: "User created successfully", data: userCreated })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//*********************************************************************************************************************************** */

const loginUser = async function (req, res) {
    try {
        let requestBody = req.body
        const { password, email } = requestBody
        if (!isValid(email)) return res.status(400).send({ status: false, message: "email is mandatory" })
        if (!isValidEmail(email)) return res.status(400).send({ status: false, message: "email not valid" })

        if (!isValid(password)) return res.status(400).send({ status: false, message: "password is mandatory" })
        if (!isValidPwd(password)) return res.status(400).send({ status: false, message: "password not valid..password length bw 8-15 and one special char and 1 uppercase " })

        let userLoggedIn = await userModel.findOne({ email })
        if (!userLoggedIn) return res.status(404).send({ status: false, message: "email not registered" })
        let checkValidPass = await bcrypt.compare(password, userLoggedIn.password)
        if (!checkValidPass) return res.status(400).send({ status: false, message: "incorrect password" })
        let user_token = jwt.sign(
            { userId: userLoggedIn._id }, "e-commerceWebsite", { expiresIn: '4d' }
        )
        return res.status(200).send({ status: true, message: "User login successfull", data: user_token })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//********************************************************************************************************************************************* */

const getUserDetails = async function (req, res) {
    try {
        const userId = req.params.userId
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "invalid user Id.." })
        const findUserId = await userModel.findById({ _id: userId })
        if (!findUserId) return res.status(404).send({ status: false, message: "user details not found..." })
        return res.status(200).send({ status: true, message: "User profile details", data: findUserId })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//************************************************************************************************************************************************ */

const updateUserDetails = async function (req, res) {
    try {
        const userId = req.params.userId
        const files = req.files
        const updateData = req.body

        const { address, fname, lname, email, phone, password } = updateData

        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, msg: "invalid user Id" })
        let findUserId = await userModel.findById({ _id: userId })
        if (!findUserId) return res.status(404).send({ status: false, msg: "user not found" })

        if ((Object.keys(updateData).length == 0)) return res.status(400).send({ status: false, msg: "please provide data to update" })///
        if (files.length!=0) {
            let updateProfileImage = await uploadFile(files[0])
            updateData.profileImage = updateProfileImage
        }
        if (fname) {
            if (!isValid(fname)) return res.status(400).send({ status: false, msg: "fname is not valid" })
            if (!isValidString(fname)) return res.status(400).send({ status: false, msg: "fname should not contain number" })
        }
        if (lname) {
            if (!isValid(lname)) return res.status(400).send({ status: false, msg: "lname is not valid" })
            if (!isValidString(lname)) return res.status(400).send({ status: false, msg: "lname should not contain number" })
        }
        if (email) {
            if (!isValidEmail(email)) return res.status(400).send({ status: false, msg: "email is not valid" })
        }
        if (phone) {
            if (!isValidMobileNum(phone)) return res.status(400).send({ status: false, msg: "phone is not valid" })
        }
        if (password) {
            if (!isValid(password)) return res.status(400).send({ status: false, msg: "password is not valid" })
            if (!isValidPwd(password)) return res.status(400).send({ status: false, message: "password not valid..password length bw 8-15 and one special char and 1 uppercase " })
            updateData.password = await bcrypt.hash(password, 10)
        }
        if (address) {
            let address1 = JSON.parse(address)

            const findAddress = await userModel.findOne({ _id: userId })

            if (address1.shipping) {
                const { street, city, pincode } = address1.shipping
                if (street) {
                    if (!isValid(street)) return res.status(400).send({ status: false, msg: "shipping street is not valid " })
                    findAddress.address.shipping.street = street
                }
                if (city) {
                    if (!isValid(city)) return res.status(400).send({ status: false, msg: "shipping city is not valid " })
                    findAddress.address.shipping.city = city
                }
                if (pincode) {
                    if (!isValid(pincode)) return res.status(400).send({ status: false, msg: "shipping pincode is not valid " })
                    findAddress.address.shipping.pincode = pincode
                }
            }
            if (address1.billing) {
                const { street, city, pincode } = address1.billing
                if (street) {
                    if (!isValid(street)) return res.status(400).send({ status: false, msg: "billing street is not valid " })
                    findAddress.address.billing.street = street
                }
                if (city) {
                    if (!isValid(city)) return res.status(400).send({ status: false, msg: "billing city is not valid " })
                    findAddress.address.billing.city = city
                }
                if (pincode) {
                    if (!isValid(pincode)) return res.status(400).send({ status: false, msg: "billing pincode is not valid " })
                    findAddress.address.billing.pincode = pincode
                }
            }
            updateData.address = findAddress.address
        }
        const updateDetails = await userModel.findByIdAndUpdate({ _id: userId }, updateData, { new: true })
        return res.status(200).send({ status: true, message: "User profile updated successfully", data: updateDetails })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

module.exports = { createUser, loginUser, getUserDetails, updateUserDetails }

