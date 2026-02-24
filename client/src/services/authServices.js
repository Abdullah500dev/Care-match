import axios from "axios";

export const authPostSampleRequest = (payloadData) => {
  return axios.post(
    `${import.meta.env.VITE_REACT_APP_API_BASE_URL}/api/auth/sample`,
    payloadData,
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    }
  );
};

export const authGetSampleRequest = () => {
  return axios.get(
    `${import.meta.env.VITE_REACT_APP_API_BASE_URL}/api/auth/sample`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    }
  );
};
