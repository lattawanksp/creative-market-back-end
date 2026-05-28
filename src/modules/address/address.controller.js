import { Address } from "./address.model.js";

export const getMyAddress = async (req, res, next) => {
  try {
    //confirm auth middleware ใช้อะไร e.g. req.user.id or req.user._id***
    const userId = req.user.id;

    const address = await Address.findOne({ userId });

    res.status(200).json({
      success: true,
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

export const upsertMyAddress = async (req, res, next) => {
  try {
    //confirm auth middleware
    const userId = req.user.id;

    const { recipientName, phone, street, district, province, postcode } =
      req.body;
    if (
      !recipientName ||
      !phone ||
      !street ||
      !district ||
      !province ||
      !postcode
    ) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required",
      });
    }

    let address = await Address.findOne({ userId });
    if (address) {
      address.recipientName = recipientName;
      address.phone = phone;
      address.street = street;
      address.district = district;
      address.province = province;
      address.postcode = postcode;

      await address.save();
    } else {
      address = await Address.create({
        userId,
        recipientName,
        phone,
        street,
        district,
        province,
        postcode,
      });
    }
    res.status(200).json({
      success: true,
      data: address,
    });
  } catch (error) {
    next(error);
  }
};
