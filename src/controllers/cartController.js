const cartModel = require('../models/cartModel')
const productModel = require('../models/productModel')
const userModel = require('../models/userModel')
const { isValid, isValidObjectId, isValidNum } = require('../utils/validation')

//*************************************************************CREATE PRODUCT********************************************************************************** */

const createCart = async function (req, res) {
    try {
        let userId = req.params.userId
        let productId = req.body.productId
        let cartId = req.body.cartId

        let productDetails = {
            productId,
            quantity: 1
        }

        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "invalid user Id.." })
        const isValidUser = await userModel.findById({ _id: userId })
        if (!isValidUser) return res.status(404).send({ status: false, message: "user not found" })

        if (!isValid(productId)) return res.status(400).send({ status: false, message: "product Id must be present in request Body.." })
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "invalid product Id.." })
        const product = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!product) return res.status(400).send({ status: false, message: "product not found or may be deleted..." })
        const productPrice = product.price
        // if (cartId) {
        //     if (!isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "invalid cart Id.." })
        // }
        const isAlreadyCart = await cartModel.findOne({ userId: userId })

        if (isAlreadyCart) {
            let alreadyProductsId = isAlreadyCart.items.map(x => x.productId.toString())
            if (alreadyProductsId.includes(productId)) {
                let updatedCart = await cartModel.findOneAndUpdate({ "items.productId": productId, userId: userId }, { $inc: { "items.$.quantity": 1, totalPrice: productPrice } }, { new: true })
                return res.status(201).send({ status: true, message: "items added successfully", data: updatedCart })
            }
            else {

                let updatedCart = await cartModel.findOneAndUpdate({ userId: userId }, { $push: { items: productDetails }, $inc: { totalItems: 1, totalPrice: productPrice } }, { new: true })
                return res.status(201).send({ status: true, message: "items added successfully", data: updatedCart })
            }
        }

        const cartCreate = {
            userId: userId,
            items: [productDetails],
            totalItems: 1,
            totalPrice: productPrice
        }
        const cartCreated = await cartModel.create(cartCreate)
        return res.status(201).send({ status: true, message: "cart created successfully", data: cartCreated })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//**********************************************************************UPDATE CART************************************************************************************************** */

const updateCart = async function (req, res) {
    try {
        const userId = req.params.userId
        const { cartId, productId, removeProduct } = req.body


        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "invalid user Id.." })
        if (! await userModel.findOne({ _id: userId })) return res.status(404).send({ status: false, message: "user does not exist.." })

        if (!cartId) return res.status(400).send({ status: false, message: "Provide cartId " })
        if (!isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "invalid cart Id.." })
        const cart1 = await cartModel.findOne({ _id: cartId })
        if (!cart1) return res.status(404).send({ status: false, message: "cart does not exist.." })
        if (cart1.items.length == 0) return res.status(404).send({ status: false, message: "No Product Present In the Cart" })

        if (!productId) return res.status(400).send({ status: false, message: "Provide productId " })
        if (!isValid(productId)) return res.status(400).send({ status: false, message: "product Id must be present in request Body.." })
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "invalid product Id.." })

        const findProduct = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!findProduct) return res.status(404).send({ status: false, message: "product details not found or may be deleted" })

        const cart = await cartModel.findOne({ $or: [{ "items.productId": productId, userId: userId }, { "items.productId": productId, _id: cartId }] })
        if (!cart) return res.status(404).send({ status: false, message: "This Product not present in the following Cart" })

        if (!removeProduct) return res.status(400).send({ status: false, message: "Provide removeProduct field " })
        if (!isValid(removeProduct)) return res.status(400).send({ status: false, message: "remove Product must be present in request Body.." })
        if (!isValidNum(removeProduct)) return res.status(400).send({ status: false, message: "remove Product should contain 0 and 1 only.." })

        const reducePrice = findProduct.price
        const quantity = cart.items.filter(x => x.productId.toString() === productId)[0].quantity

        if (removeProduct == 0) {
            const deleteProduct = await cartModel.findOneAndUpdate({ "items.productId": productId, userId: userId }, { $pull: { items: { productId: productId } }, $inc: { totalItems: -1, totalPrice: -reducePrice * quantity } }, { new: true })
            return res.status(200).send({ status: true, messsage: "item removed successfully", data: deleteProduct })
        }
        if (removeProduct == 1) {
            if (quantity > 1) {
                let reduceProduct = await cartModel.findOneAndUpdate({ "items.productId": productId, userId: userId }, { $inc: { "items.$.quantity": -1, totalPrice: -reducePrice } }, { new: true })
                return res.status(200).send({ status: true, messsage: "product removed successfully", data: reduceProduct })
            }
            else {
                const deleteProduct = await cartModel.findOneAndUpdate({ "items.productId": productId, userId: userId }, { $pull: { items: { productId: productId } }, $inc: { totalItems: -1, totalPrice: -reducePrice * quantity } }, { new: true })
                return res.status(200).send({ status: true, messsage: "item removed successfully", data: deleteProduct })
            }
        }
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//***********************************************************************GET CART********************************************************************************************* */

const getCart = async function (req, res) {
    try {
        const userId = req.params.userId
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "invalid user Id.." })

        const userExist = await userModel.findById({ _id: userId })
        if (!userExist) return res.status(404).send({ status: false, message: "user not found.." })

        const isCartExist = await cartModel.findOne({ userId: userId })
        if (!isCartExist) return res.status(404).send({ status: false, message: "cart does not exist, create first.." })
        return res.status(200).send({ status: true, message: "your cart summary", data: isCartExist })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//**********************************************************************DELETE CART************************************************************************************* */


const deleteCart = async function (req, res) {
    try {
        let userId = req.params.userId

        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "invalid user Id.." })

        const userExist = await userModel.findById({ _id: userId })
        if (!userExist) return res.status(404).send({ status: false, message: "user not found.." })

        const isCartExist = await cartModel.findOne({ userId: userId })
        if (!isCartExist) return res.status(404).send({ status: false, message: "cart does not exist..." })

        const cartDeleted = await cartModel.findOneAndUpdate({ _id: isCartExist._id }, { items: [], totalPrice: 0, totalItems: 0 }, { new: true })
        return res.status(204).send({ status: true, message: "your cart is empty..continue shopping", data: cartDeleted })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}


module.exports = { createCart, updateCart, getCart, deleteCart }
