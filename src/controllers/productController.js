
const productModel = require('../models/productModel')
const { uploadFile } = require('../utils/aws')
const { isValid, isImageFile, isValidBody, isValidSize, isValidString, isValidObjectId, isValidPrice } = require('../utils/validation')

//******************************************CREATE PRODUCT*************************************************************/

const createProduct = async function (req, res) {
    try {
        let requestBody = req.body
        let files = req.files
        let { title, description, price, currencyId, style, availableSizes, installments } = requestBody

        if (!isValidBody(requestBody)) return res.status(400).send({ status: false, msg: "provide details" })

        if (!title) return res.status(400).send({ status: false, message: "title is mandatory" })
        if (!isValid(title)) return res.status(400).send({ status: false, message: "title Should be Valid" })
        if (await productModel.findOne({ title })) return res.status(400).send({ status: false, message: "title Should be Unique" })

        if (!description) return res.status(400).send({ status: false, message: "description is mandatory" })
        if (!isValid(description)) return res.status(400).send({ status: false, message: "title Should be Valid" })

        if (!price) return res.status(400).send({ status: false, message: "price is mandatory" })
        if (!isValidPrice(price)) return res.status(400).send({ status: false, message: "price Should be Valid" })

        if (!currencyId) return res.status(400).send({ status: false, message: "currencyId is mandatory" })
        if (currencyId.toUpperCase() != "INR") return res.status(400).send({ status: false, message: "currencyId Should be Valid" })
        requestBody.currencyId = currencyId.toUpperCase()
        requestBody.currencyFormat = "₹"

        if (!style) return res.status(400).send({ status: false, message: "style is mandatory" })
        if (!isValid(style)) return res.status(400).send({ status: false, message: "style Should be Valid" })
        if (!isValidString(style)) return res.status(400).send({ status: false, message: "style Should Not Contain Numbers" })

        if (!availableSizes) return res.status(400).send({ status: false, message: "availableSizes is mandatory" })
        availableSizes = availableSizes.split(",").map(x => x.trim().toUpperCase())
        if (availableSizes.map(x => isValidSize(x)).filter(x => x === false).length !== 0) return res.status(400).send({ status: false, message: "Size Should be Among  S,XS,M,X,L,XXL,XL" })
        requestBody.availableSizes = availableSizes

        if (!installments) return res.status(400).send({ status: false, message: "installments is mandatory" })
        // if (!isValidNum(installments)) return res.status(400).send({ status: false, message: "installments Should be whole Number Only" })

        if (!(files && files.length > 0)) return res.status(400).send({ status: false, message: "profile image is mandatory" })
        if (!isImageFile(files[0].originalname)) return res.status(400).send({ status: false, message: "Please provide image only" })

        let imageUrl = await uploadFile(files[0])
        requestBody.productImage = imageUrl

        let productCreated = await productModel.create(requestBody)
        return res.status(201).send({ status: true, message: "User created successfully", data: productCreated })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//***********************************************GET PRODUCT***********************************************************/

const getProduct = async function (req, res) {
    try {
        const requestQuery = req.query
        const { size, name, priceGreaterThan, priceLessThan, priceSort } = requestQuery
        const filterQuery = { isDeleted: false }

        if (Object.keys(requestQuery).length > 0) { 
            if (size) {
                let size1 = size.split(",").map(x => x.trim().toUpperCase())
                if (size1.map(x => isValidSize(x)).filter(x => x === false).length !== 0) return res.status(400).send({ status: false, message: "Size Should be among  S,XS,M,X,L,XXL,XL" })
                filterQuery.availableSizes = { $in: size1 }
            }

            if (name) {
                let findTitle = await productModel.find()
                let fTitle = findTitle.map(x => x.title).filter(x => x.includes(name))

                if (fTitle.length == 0) { filterQuery.title = name }
                filterQuery.title = { $in: fTitle }
            }
            if (priceGreaterThan && priceLessThan) { filterQuery.price = { $gt: priceGreaterThan, $lt: priceLessThan } }
            if (priceGreaterThan && !priceLessThan) { filterQuery.price = { $gt: priceGreaterThan } }
            if (priceLessThan && !priceGreaterThan) { filterQuery.price = { $lt: priceLessThan } }
        }

        const findProducts = await productModel.find(filterQuery).sort({ price: priceSort })
        if (!findProducts) return res.status(404).send({ status: false, message: "products not found or may be deleted" })
        return res.status(200).send({ status: true, count: findProducts.length, message: "products details", data: findProducts })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//****************************************************GET BY ID************************************************************************************* */

const getProductById = async function (req, res) {
    try {
        const productId = req.params.productId
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "invalid product Id.." })
        const findProduct = await productModel.findById({ _id: productId, isDeleted: false })
        if (!findProduct) return res.status(404).send({ status: false, message: "product details not found or may be deleted" })
        return res.status(200).send({ status: true, message: "product details", data: findProduct })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

///**************************************************UPDATE PRODUCTS******************************************************************************** */
const updateProductDetails = async function (req, res) {
    try {
        const productId = req.params.productId
        const image = req.files
        const updateData = req.body

        let { title, description, price, style, availableSizes, installments } = updateData

        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, msg: "invalid product Id" })

        let findProductId = await productModel.findById({ _id: productId, isDeleted: false })
        if (!findProductId) return res.status(404).send({ status: false, msg: "Product not found" })

        if ((Object.keys(updateData).length == 0)) return res.status(400).send({ status: false, msg: "please provide data to update" })

        if (image && image.length > 0) {
            if (!isImageFile(image[0].originalname)) return res.status(400).send({ status: false, message: "Please provide image only" })
            let updateProductImage = await uploadFile(image[0])
            updateData.productImage = updateProductImage
        }

        if (typeof title != "undefined") {
            if (!isValid(title)) return res.status(400).send({ status: false, message: "title Should be Valid" })
            if (!isValidString(title)) return res.status(400).send({ status: false, message: "title should not contain number" })
            if (await productModel.findOne({ title })) return res.status(400).send({ status: false, message: "title Should be Unique" })
        }
        if (description != undefined) {
            if (!isValid(description)) return res.status(400).send({ status: false, message: "description Should be Valid" })
        }
        if (price != undefined) {
            if (!isValidPrice(price)) return res.status(400).send({ status: false, message: "price Should be Valid" })
        }

        if (style != undefined) {
            if (!isValid(style)) return res.status(400).send({ status: false, message: "style Should be Valid" })
            if (!isValidString(style)) return res.status(400).send({ status: false, message: "style Should Not Contain Numbers" })
        }
        if (availableSizes != undefined) {
            if (!isValid(availableSizes)) return res.status(400).send({ status: false, message: "availableSizes Should be Valid" })
            availableSizes = availableSizes.split(",").map(x => x.trim().toUpperCase())
            if (availableSizes.map(x => isValidSize(x)).filter(x => x === false).length !== 0) return res.status(400).send({ status: false, message: "Size Should be Among  S,XS,M,X,L,XXL,XL" })
            updateData.availableSizes = availableSizes
        }
        if (installments != undefined) {
            if (isValidString(installments)) return res.status(400).send({ status: false, message: "installments Should be whole Number Only" })
        }

        const updateDetails = await productModel.findByIdAndUpdate({ _id: productId, isDeleted: false }, updateData, { new: true }).select({__v:0})
        return res.status(200).send({ status: true, message: "User profile updated successfully", data: updateDetails })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}


//****************************************************DELETE BY ID************************************************************************************ */

const deleteProductById = async function (req, res) {
    try {
        const productId = req.params.productId
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, msg: "invalid product Id" })
        const deleteProduct = await productModel.findByIdAndUpdate({ _id: productId }, { isDeleted: true }, { new: true })
        if (!deleteProduct) return res.status(404).send({ status: false, message: "product not found or may be already deleted" })
        return res.status(200).send({ status: true, message: "product deleted successfully" })
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

//--------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = { createProduct, getProduct, getProductById, updateProductDetails, deleteProductById }
