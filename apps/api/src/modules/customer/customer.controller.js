import * as customerService from "./customer.service.js";

export const create = async (req, res) => {
  try {
    const customer = await customerService.create(req.db, req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: "Error creating customer", error });
  }
};

export const findAll = async (req, res) => {
  try {
    const customers = await customerService.findAll(req.db);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching customers", error });
  }
};

export const findById = async (req, res) => {
  try {
    const customer = await customerService.findById(req.db, req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: "Error fetching customer", error });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await customerService.update(req.db, id, {
      name: req.body.name,
      nit: req.body.nit,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      active: req.body.active
    });

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error.message
    });
  }
};


export const deleteCustomer = async (req, res) => {
  try {
    await customerService.deleteCustomer(req.db, req.params.id);
    res.json({ message: "Customer inactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error inactivating customer", error });
  }
};
export const deactivate = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await customerService.deactivate(req.db, id);

    res.json({
      ok: true,
      message: "Cliente desactivado correctamente",
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

export const activate = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await customerService.activate(req.db, id);

    res.json({
      ok: true,
      message: "Cliente activado correctamente",
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};
