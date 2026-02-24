import axios from "axios";

export const userPostSampleRequest = (payloadData) => {
  return axios.post(
    `${import.meta.env.VITE_REACT_APP_API_BASE_URL}/api/user/sample`,
    payloadData,
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    }
  );
};

export const userGetSampleRequest = () => {
  return axios.get(
    `${import.meta.env.VITE_REACT_APP_API_BASE_URL}/api/user/sample`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    }
  );
};
