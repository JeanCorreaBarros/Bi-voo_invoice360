export const profitReport = async (req, res) => {

  try {

    const { from, to } = req.query

    const data = await service.getProfitReport(from, to)

    res.json({
      ok: true,
      data
    })

  } catch (error) {

    res.status(500).json({
      ok: false,
      message: error.message
    })

  }

}