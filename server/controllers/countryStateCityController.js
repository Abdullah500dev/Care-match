import catchAsyncError from "../middlewares/catchAsyncErrors.js";
import CountryStateCity from "../models/countryStateCityModel.js";

const getCountries = catchAsyncError(async (req, res) => {
  try {
    const countries = (
      await CountryStateCity.aggregate([
        { $group: { _id: "$country" } },
        { $sort: { _id: 1 } },
      ])
    ).map((item) => item._id);

    res.status(200).json({
      status: "success",
      data: countries,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

const getStatesForCountry = catchAsyncError(async (req, res) => {
  try {
    const country = req.query.country;
    const states = (
      await CountryStateCity.aggregate([
        { $match: { country: country } },
        { $group: { _id: "$state" } },
        { $sort: { _id: 1 } },
      ])
    ).map((item) => item._id);

    res.status(200).json({
      status: "success",
      data: states,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

const getCitiesForStateAndCountry = catchAsyncError(async (req, res) => {
  try {
    const country = req.query.country;
    const state = req.query.state;
    const cities = (
      await CountryStateCity.aggregate([
        { $match: { country: country, state: state } },
        { $group: { _id: "$city" } },
        { $sort: { _id: 1 } },
      ])
    ).map((item) => item._id);

    res.status(200).json({
      status: "success",
      data: cities,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

const getZipCodesForCitiesAndStateAndCountry = catchAsyncError(
  async (req, res) => {
    try {
      const country = req.query.country;
      const state = req.query.state;
      const city = req.query.city;
      const zipCodes = (
        await CountryStateCity.aggregate([
          { $match: { country: country, state: state, city: city } },
          { $group: { _id: "$zip" } },
          { $sort: { _id: 1 } },
        ])
      ).map((item) => item._id);

      res.status(200).json({
        status: "success",
        data: zipCodes,
      });
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

const getShortCodeForCountry = async (country) => {
  const result = await CountryStateCity.findOne({ country: country });
  return result.countryShortCode;
};

const getShortCodeForState = async (state) => {
  const result = await CountryStateCity.findOne({ state: state });
  return result.stateShortCode;
};

export default {
  getCountries,
  getStatesForCountry,
  getCitiesForStateAndCountry,
  getZipCodesForCitiesAndStateAndCountry,
  getShortCodeForCountry,
  getShortCodeForState,
};
