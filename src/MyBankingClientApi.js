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

    }

    static logout() {

    }

    static getBankApiAuthToken(bank, code, redirectUri) {
        return ApiAdapters[bank].getAuthToken(code, redirectUri);
    }

    static refreshBankingApiAuthToken(bank, token) {
        return ApiAdapters[bank].refreshAuthToken(token)
    }

    static validateProfile(key) {
        return Datastore.retrieve(EntityTypes.PROFILE, key)
            .then(result => {
                return result ? true : false
            })
    }

    static setProfile(profile, key) {
        return Datastore.save(EntityTypes.PROFILE, profile, key)
            .then(profileKey => {
                return { profile, profileKey };
            })
    }

    static getProfile(key) {
        return Datastore.retrieve(EntityTypes.PROFILE, key);
    }

    static getBankProfile(bank, access_token, refresh_token) {
        return ApiAdapters[bank].getBasicUserInfo(access_token);
    }

    static getBankAccounts(bank, access_token, refresh_token) {
        return ApiAdapters[bank].getAccounts();
    }

    static getBankAccountTransactions(bank, accountKey, access_token, refresh_token) {
        return ApiAdapters[bank].getAccountTransactions(accountKey);
    }
}