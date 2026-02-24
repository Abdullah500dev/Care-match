import axios from "axios";

export const sampleGetRequest = (name) => {
  return axios.get(`https://api.nationalize.io/?name=${name}`, {
    headers: {
      "Content-Type": "application/json",
    },
    // withCredentials: true,
  });
};
