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

    static getBankProfile(bank, profile) {
        const access_token = profile.banks[bank].auth_data.access_token;
        const refresh_token = profile.banks[bank].auth_data.refresh_token;

        return ApiAdapters[bank].getBasicUserInfo(access_token)
            .then(result => {
                if (result.code === 401) {
                    return MyBankingClientApi.refreshBankingApiAuthToken(bank, refresh_token)
                        .then(result => {
                            const newProfile = { ...profile, banks: { ...profile.banks, [bank]: { ...profile.banks[bank], auth_data:result.data } } }
                            return MyBankingClientApi.setProfile(newProfile, profile.key);
                        })
                        .then(result => {
                            return ApiAdapters[bank].getBasicUserInfo(bank, result.profile)
                        });
                } else {
                    return result;
                }
            });
    }

    static getBankAccounts(bank, access_token) {
        return ApiAdapters[bank].getAccounts(access_token);
    }

    static getBankAccountTransactions(bank, accountKey, access_token) {
        return ApiAdapters[bank].getAccountTransactions(accountKey);
    }
}