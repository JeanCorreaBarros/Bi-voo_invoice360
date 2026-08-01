import * as supplierService from "./supplier.service.js";

export const create = async (req, res) => {
  try {
    const supplier = await supplierService.create(req.db, req.body);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: "Error creating supplier", error });
  }
};

export const findAll = async (req, res) => {
  try {
    const suppliers = await supplierService.findAll(req.db);
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching suppliers", error });
  }
};

export const findById = async (req, res) => {
  try {
    const supplier = await supplierService.findById(req.db, req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: "Error fetching supplier", error });
  }
};

export const update = async (req, res) => {
  try {
    const supplier = await supplierService.update(
      req.db,
      req.params.id,
      req.body
    );
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: "Error updating supplier", error });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    await supplierService.deleteSupplier(req.db, req.params.id);
    res.json({ message: "Supplier inactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error inactivating supplier", error });
  }
};
