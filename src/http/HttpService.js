import Axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL;

const API_URL = `${baseURL}/`;
const axios = Axios.create({});

export default {

    get(endpoint, data, token) {
        return ajax(endpoint, 'GET', data, token);
    },
    post(endpoint, data, token) {
        return ajax(endpoint, 'POST', data, token);
    },
    put(endpoint, data, token) {
        return ajax(endpoint, 'PUT', data, token);
    },
    delete(endpoint, data, token) {
        return ajax(endpoint, 'DELETE', data, token);
    }
};

export async function ajaxGet(endpoint) {
    return axios({
        url: `${endpoint}`, method: "GET", data: null, headers: {
            'Access-Control-Allow-Origin': '*',
        },
    });
}

async function ajax(endpoint, method = 'get', data = null, token = null) {
    const res = axios({
        url: `${API_URL}${endpoint}`,
        method,
        data,
        headers: {
            Authorization: `Bearer ${token}`,
            'Access-Control-Allow-Origin': '*',
        },
    });

    return res;
}
