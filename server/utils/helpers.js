import { DateTime } from "luxon";
import config from "../config/env.js";

const getRandomNumber = (min, max) => {
  return Math.random() * (max - min) + min;
};

const parseDate = (input) => {
  if (!input) return null;

  if (input instanceof Date && !isNaN(input)) return input;

  const cleaned = String(input).trim();

  if (!isNaN(cleaned) && Number(cleaned) > 20000 && Number(cleaned) < 60000) {
    const excelBase = DateTime.fromISO("1899-12-30"); // Excel 0 = 1899-12-30
    const date = excelBase.plus({ days: Number(cleaned) });
    return date.toJSDate();
  }

  const formats = [
    "yyyy-MM-dd",
    "yyyy/MM/dd",
    "yyyy.MM.dd",
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm:ss.SSS",
    "yyyy-MM-dd'T'HH:mm:ssZZ",
    "yyyy-MM-dd'T'HH:mm:ss.SSSZZ",
    "MM-dd-yyyy",
    "MM/dd/yyyy",
    "MM.dd.yyyy",
    "M/d/yyyy",
    "MMM d, yyyy",
    "MMMM d, yyyy",
    "dd-MM-yyyy",
    "dd/MM/yyyy",
    "dd.MM.yyyy",
    "d-M-yyyy",
    "d/M/yyyy",
    "d MMM yyyy",
    "d MMMM yyyy",
    "yyyy-MM-dd HH:mm:ss",
    "dd-MM-yyyy HH:mm:ss",
    "MM/dd/yyyy HH:mm:ss",
    "dd/MM/yyyy HH:mm:ss",
    "yyyy-MM-dd hh:mm a",
    "dd-MM-yyyy hh:mm a",
    "yyyy-MM-dd hh:mm:ss a",
    "dd-MM-yyyy hh:mm:ss a",
    "EEE, dd MMM yyyy HH:mm:ss ZZZ",
    "EEE MMM dd yyyy HH:mm:ss ZZZ",
    "EEE, d MMM yyyy HH:mm:ss ZZZ",
    "M/d/yy",
    "M/d/yyyy",
    "MM/dd/yy",
    "MM/dd/yyyy",
    "dd-MMM-yy",
    "d-MMM-yy",
    "MMM d yyyy",
    "MMMM d yyyy",
    "MMM yyyy",
    "MMMM yyyy",
    "yyyy",
  ];

  for (const format of formats) {
    const dt = DateTime.fromFormat(cleaned, format, { zone: "utc" });
    if (dt?.isValid) return dt.toJSDate();
  }

  const iso = DateTime.fromISO(cleaned);
  if (iso?.isValid) return iso.toJSDate();

  const native = DateTime.fromJSDate(new Date(cleaned));
  if (native?.isValid) return native.toJSDate();

  return null;
};

const cleanPhoneNumber = (phone) => {
  if (!phone || typeof phone !== "string") return null;

  let cleaned = phone.replace(/\D/g, "");

  cleaned = cleaned.replace(/^0+/, "");

  if (cleaned.length < 7) return null;

  return cleaned;
};

const cleanAddress = (address) => {
  if (!address) return null;
  const trimmedAddress = address.trim().replace(/\s+/g, " ");
  if (
    !trimmedAddress ||
    trimmedAddress.length < 5 ||
    !/[a-zA-Z]/.test(trimmedAddress) ||
    /^[\d\s-]+$/.test(trimmedAddress)
  ) {
    return null;
  }
  return trimmedAddress;
};

const formatName = (firstname, middlename, lastname) => {
  return [firstname, middlename, lastname].filter(Boolean).join(" ");
};

const currentFormattedDate = () => {
  const date = new Date();
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

const replaceDynamicFields = (content, replacements) => {
  let dynamicContent = content;

  for (const [key, value] of Object.entries(replacements)) {
    const escapedKey = key.replace(/[$()*+./?[\\\]^{|}]/g, "\\$&");
    const regex = new RegExp(escapedKey, "g");
    dynamicContent = dynamicContent.replace(regex, value || "");
  }

  return dynamicContent;
};

const generateTrackingPixel = (trackingId) => {
  const pixelUrl = `${config.SERVER_BASE_URL}/api/communication/email/campaign/track/${trackingId}`;
  return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`;
};

const injectTrackingPixel = (content, trackingId) => {
  return `${content}${generateTrackingPixel(trackingId)}`;
};

const formatImageUrl = (imageUrl) => {
  const urlPattern = /^(http:\/\/|https:\/\/|www\.)/i;
  if (!urlPattern.test(imageUrl)) {
    return `${config.SERVER_BASE_URL}/uploads/${imageUrl}`;
  }

  return imageUrl;
};

export default {
  getRandomNumber,
  parseDate,
  cleanPhoneNumber,
  cleanAddress,
  formatName,
  currentFormattedDate,
  replaceDynamicFields,
  generateTrackingPixel,
  injectTrackingPixel,
  formatImageUrl,
};
