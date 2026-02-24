import EmailTemplate from "../models/emailTemplateModel.js";

const getTemplateByName = async (templateName) => {
  return await EmailTemplate.findOne({
    name: templateName,
  })
    .select("-createdAt -updatedAt -__v")
    .exec();
};

export default {
  getTemplateByName,
};
