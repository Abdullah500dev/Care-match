import request from "superagent";
import crypto from "crypto";
import config from "../config/env.js";

const subscribeToNewsletter = async (email) => {
  const emailHash = crypto
    .createHash("md5")
    .update(email.toLowerCase())
    .digest("hex");

  return new Promise((resolve, reject) => {
    request
      .put(
        "https://" +
          config.MAIL_CHIMP_INSTANCE +
          ".api.mailchimp.com/3.0/lists/" +
          config.MAIL_CHIMP_LIST_UNIQUE_ID +
          "/members/" +
          emailHash
      )
      .set("Content-Type", "application/json;charset=utf-8")
      .set(
        "Authorization",
        "Basic " +
          Buffer.from("any:" + config.MAIL_CHIMP_API_KEY).toString("base64")
      )
      .send({
        email_address: email,
        status_if_new: "subscribed",
        status: "subscribed",
      })
      .end((error, response) => {
        if (
          response.status < 300 ||
          (response.status === 400 && response.body.title === "Member Exists")
        ) {
          resolve("Newsletter signed up successfully!");
        } else {
          reject(new Error(error || response.body.title));
        }
      });
  });
};

const unsubscribeFromNewsletter = async (email) => {
  const emailHash = crypto
    .createHash("md5")
    .update(email.toLowerCase())
    .digest("hex");

  return new Promise((resolve, reject) => {
    request
      .patch(
        "https://" +
          config.MAIL_CHIMP_INSTANCE +
          ".api.mailchimp.com/3.0/lists/" +
          config.MAIL_CHIMP_LIST_UNIQUE_ID +
          "/members/" +
          emailHash
      )
      .set("Content-Type", "application/json;charset=utf-8")
      .set(
        "Authorization",
        "Basic " +
          Buffer.from("any:" + config.MAIL_CHIMP_API_KEY).toString("base64")
      )
      .send({
        status: "unsubscribed",
      })
      .end((error, response) => {
        if (
          response.status < 300 ||
          (response.status === 400 && response.body.title === "Member Exists")
        ) {
          resolve("Newsletter unsubscribed successfully!");
        } else {
          reject(new Error(error || response.body.title));
        }
      });
  });
};

export default { subscribeToNewsletter, unsubscribeFromNewsletter };
