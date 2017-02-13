import uuid from 'uuid'
import { BankProfile, Accounts, Account, AccountTransactions } from './DataTypes/AdapterDataTypes'
import btoa from 'btoa'
import fetch from 'node-fetch'

export default class CitiApi {

    /*
        This will eventually move into a middleware on the server side.  A lot of
        the values in here will be pulled from config based off environment variables
        but since those are static with the client build we have to derrive things
        like the endpoints and redirectUri from the client.
    */
    static getAuthToken(key, redirectUri) {
        return new Promise(function (resolve, reject) {
            const authorization = btoa("a12b4efd-d529-416a-ab19-37585d54b0a3:C7cV5aO5bH2rP6oE4gO3vV2bO5kO6sU3iV5lN8xQ4rY4iN6cT8");
            const url = `https://sandbox.apihub.citi.com/gcb/api/authCode/oauth2/token/sg/gcb`;
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authorization}`
                },
                body: `grant_type=authorization_code&code=${key}&redirect_uri=${redirectUri}`,
                mode: 'cors'
            }

            fetch(url, options)
                .then(response =>
                    response.json().then(json => ({
                        status: response.status,
                        data: json
                    })))
                .then(function (response) {
                    console.log('Token Request succeeded with JSON response', response);
                    if (response.status === 200) {
                        resolve(response.data);
                    } else {
                        reject(response.data.result.info);
                    }
                })
                .catch(function (error) {
                    console.log('Token Request failed', error);
                    reject(error);
                });
        })
    }

    static refreshAuthToken(token) {
        return new Promise(function (resolve, reject) {
            const profile = JSON.parse(localStorage.getItem('profile'));
            const authorization = btoa("app.bbva.mynewapp:gQZxI*hKVUF64ADt9BC34rmVT5Ztk0YtiQzBHv3LO2CtsIxS612q$xFBcawpJs4S");
            const url = 'https://connect.bbva.com/token?grant_type=refresh_token';
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authorization}`
                },
                mode: 'cors',
                body: `refresh_token=${token}`

            }

            fetch(url, options)
                .then(response =>
                    response.json().then(json => ({
                        status: response.status,
                        data: json
                    })))
                .then(function (response) {
                    console.log('Token Request succeeded with JSON response', response.data);
                    if (response.status === 200) {
                        profile.banks.bbva = { auth_data: response.data };
                        localStorage.setItem('profile', JSON.stringify(profile));
                        resolve(response.data);
                    } else if (response.status === 401 && response.data.result.internal_code === "invalid_token") {
                        alert('You must re-authenticate to the bank as your access has expired.');
                        reject('You must re-authenticate to the bank as your access has expired.');;
                    } else {
                        reject(response.data.result.info);
                    }
                })
                .catch(function (error) {
                    console.log('Token Request failed', error);
                    reject(error);
                });
        })
    }

    static getBasicUserInfo(authorization) {
        return new Promise(function (resolve, reject) {
            const url = 'https://sandbox.apihub.citi.com/gcb/api/v1/customer';
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authorization}`,
                    'client_id': 'a12b4efd-d529-416a-ab19-37585d54b0a3',
                    'uuid': uuid.v4()
                },
                mode: 'cors'
            }

            fetch(url, options)
                .then(response =>
                    response.json().then(json => ({
                        status: response.status,
                        data: json
                    })))
                .then(function (response) {
                    console.log('BasicUserInfo Request succeeded with JSON response', response);
                    if (response.status === 200) {
                        resolve(BankProfile.parseCitiProfile(response.data));
                    } else {
                        reject(response.result.info);
                    }
                }.bind(this))
                .catch(function (error) {
                    console.log('BasicUserInfo Request failed', error);
                    reject(error);
                });
        }.bind(this));
    }

    static getAccounts(authorization) {
        return new Promise(function (resolve, reject) {
            const url = 'https://sandbox.apihub.citi.com/gcb/api/v1/accounts';
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authorization}`,
                    'client_id': 'a12b4efd-d529-416a-ab19-37585d54b0a3',
                    'uuid': uuid.v4()
                },
                mode: 'cors'
            }

            fetch(url, options)
                .then(response =>
                    response.json().then(json => ({
                        status: response.status,
                        data: json
                    })))
                .then(function (response) {
                    console.log('Accounts Request succeeded with JSON response', response);
                    if (response.status === 200) {
                        const accounts = Accounts.parseCitiAccounts(response.data.accountGroupSummary);
                        resolve(accounts);
                    } else {
                        reject(response.result.info);
                    }
                }.bind(this))
                .catch(function (error) {
                    console.log('Accounts Request failed', error);
                    reject(error);
                });
        }.bind(this));
    }

    static getAccountTransactions(detailLink) {
        return new Promise(function (resolve, reject) {
            const authorization = JSON.parse(localStorage.getItem('profile')).banks.bbva.auth_data.access_token;
            const refresh = JSON.parse(localStorage.getItem('profile')).banks.bbva.auth_data.refresh_token;
            const url = `${detailLink}/transactions`;
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `jwt ${authorization}`
                },
                mode: 'cors'
            }

            fetch(url, options)
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    console.log('Account Transactions Request succeeded with JSON response', data);
                    if (data.result.code === 200 || data.result.code === 206) {
                        resolve(data);
                    } else if (data.result.code === 401 && data.result.internal_code === "invalid_token") {
                        this.refreshAuthToken(refresh);
                    } else {
                        reject(data.result.info);
                    }
                }.bind(this))
                .catch(function (error) {
                    console.log('Accounts Request failed', error);
                    reject(error);
                });
        }.bind(this));
    }

}