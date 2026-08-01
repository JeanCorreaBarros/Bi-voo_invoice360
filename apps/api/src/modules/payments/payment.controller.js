import * as service from "./payment.service.js"

export const createPayment = async (req, res) => {

  try {

    const payment = await service.createPayment(req.db, req.body)

    res.json({
      ok: true,
      data: payment
    })

  } catch (error) {

    res.status(400).json({
      ok: false,
      message: error.message
    })

  }

}
