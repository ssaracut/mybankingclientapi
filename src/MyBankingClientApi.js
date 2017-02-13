/*
 This is just faking out a middleware that doesnt exist yet
*/
import BbvaApi from './BbvaApi'
import CitiApi from './CitiApi'
import Datastore, { EntityTypes } from './Datastore'

const ApiAdapters = {
    bbva: BbvaApi,
    citi: CitiApi
}

export default class MyBankingClientApi {

    static login() {
        return new Promise(function (resolve, reject) {
            const auth_data = {};
            resolve(auth_data);
        })
    }

    static logout() {
        return new Promise(function (resolve, reject) {
            resolve({});
        })
    }

    static getBankApiAuthToken(bank, code, redirectUri) {
        return ApiAdapters[bank].getAuthToken(code, redirectUri)
            .then(auth_data => {
                return auth_data
            });
    }

    static validateProfile(key) {
        return new Promise(function (resolve, reject) {
            Datastore.retrieve(EntityTypes.PROFILE, key)
                .then(result => {
                    if (result) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                })
                .catch(error => { reject(error) })
        });
    }

    static setProfile(profile, key) {
        return Datastore.save(EntityTypes.PROFILE, profile, key)
            .then(profileKey => {
                console.log(`saved profile key: ${JSON.stringify(profileKey)}`)
                return { profile, profileKey };
            })
    }

    static getProfile(key) {
        return Datastore.retrieve(EntityTypes.PROFILE, key);
    }

    static getBankProfile(bank, access_token, refresh_token) {
        return ApiAdapters[bank].getBasicUserInfo(access_token)
            .then(result => {
                return result
            })
    }

    // static getAccounts() {
    //     return new Promise(function (resolve, reject) {
    //         //get profile from datastore
    //         let profile = JSON.parse(localStorage.getItem('profile'));

    //         //grab accounts info from each registered bank
    //         const apiCalls = [];
    //         for (let bank in profile.banks) {
    //             apiCalls.push(ApiAdapters[bank].getAccounts())
    //         }

    //         Promise.all(apiCalls)
    //             .then(function (values) {
    //                 let accounts = new Accounts();
    //                 values.forEach(returnedAccounts => {
    //                     accounts = [...accounts, ...returnedAccounts];
    //                 })
    //                 resolve(accounts);
    //             })
    //             .catch(function (error) {
    //                 reject(error)
    //             });
    //     })
    // }

    // static getAccountTransactions(detailLink) {
    //     return BbvaApi.getAccountTransactions(detailLink);
    // }
}