import * as service from "../services/creditNoteService.js"

export const create = async (req, res) => {

  try {

    const creditNote = await service.createCreditNote(req.body)

    res.json({
      ok: true,
      data: creditNote
    })

  } catch (error) {

    res.status(400).json({
      ok: false,
      message: error.message
    })

  }

}