import * as resolutionService from "./resolution.service.js";

export const create = async (req, res) => {
  try {
    const { prefix, fromNumber, toNumber } = req.body;

    if (!prefix || !fromNumber || !toNumber) {
      return res.status(400).json({
        message: "prefix, fromNumber and toNumber are required",
      });
    }

    const resolution = await resolutionService.create(req.db, {
      prefix,
      fromNumber: Number(fromNumber),
      toNumber: Number(toNumber),
      currentNumber: 0,
    });

    res.status(201).json(resolution);
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error.message,
    });
  }
};

export const findAll = async (req, res) => {
  try {
    const resolutions = await resolutionService.findAll(req.db);
    res.json(resolutions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching resolutions" });
  }
};

export const findById = async (req, res) => {
  try {
    const { id } = req.params;

    const resolution = await resolutionService.findById(req.db, id);

    if (!resolution) {
      return res.status(404).json({ message: "Resolution not found" });
    }

    res.json(resolution);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching resolution" });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await resolutionService.update(req.db, id, req.body);

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error.message,
    });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await resolutionService.remove(req.db, id);

    res.json({ message: "Resolution inactivated successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error.message,
    });
  }
};
