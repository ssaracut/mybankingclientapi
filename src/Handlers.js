import JWT from 'jsonwebtoken'
import MyBankingClientApi from './MyBankingClientApi'
import { Profile, BankProfile, Accounts } from './DataTypes/ServiceDataTypes'

function generateJwt(key) {
    return JWT.sign({ key }, 'NeverShareYourSecret');
}

export default class Handlers {

    static loginGoogle(request, reply) {
        request.log(request.path);

        if (!request.auth.isAuthenticated) {
            return reply('Authentication failed due to: ' + request.auth.error.message);
        }

        const location = process.env.NODE_ENV === 'development' ? "https://localhost:3000/" : "/";
        const provider = request.auth.credentials.provider;
        const providerId = request.auth.credentials.profile.id;
        const profileKey = `${provider}:${providerId}`;
        const providerToken = request.auth.credentials.token;
        const providerExpiresIn = request.auth.credentials.expiresIn;

        const cookie_options = {
            ttl: 5 * 24 * 60 * 60 * 1000, // expires 5 days from today 
            encoding: 'none',    // we already used JWT to encode 
            isSecure: process.env.NODE_ENV === 'development' ? false : true, // warm & fuzzy feelings 
            isHttpOnly: true,    // prevent client alteration 
            clearInvalid: false, // remove invalid cookies 
            strictHeader: true   // don't allow violations of RFC 6265 
        }

        //check if a user profile exists -> 
        MyBankingClientApi.getProfile(profileKey)
            .then(profile => {

                if (profile) {
                    return reply.redirect(location).state("token", generateJwt(profileKey), cookie_options).code(200);
                } else {
                    const newProfile = {
                        provider,
                        token: request.auth.credentials.token,
                        expiresIn: request.auth.credentials.expiresIn,
                        firstName: request.auth.credentials.profile.name.given_name,
                        lastName: request.auth.credentials.profile.name.family_name,
                        email: request.auth.credentials.profile.email,
                        banks: {}
                    }
                    MyBankingClientApi.setProfile(newProfile, profileKey)
                        .then(profileKey => {
                            return reply.redirect(location).state("token", generateJwt(profileKey), cookie_options).code(201);
                        })
                        .catch(error => {
                            return reply('Profile Error').code(400);
                        });
                }

            })
            .catch(error => {
                return reply('Profile Error').code(400);
            });
    }

    static getBankAuth(request, reply) {
        request.log(request.path);

        const bank = request.params.bank;
        const code = request.payload.code;
        const profileKey = request.auth.credentials.key;
        const redirectUri = request.headers.referer.split("?")[0];

        if (bank && code && redirectUri) {
            MyBankingClientApi.getProfile(profileKey)
                .then(profile => {
                    return MyBankingClientApi.getBankApiAuthToken(bank, code, redirectUri)
                        .then(auth_data => {
                            return { ...profile, banks: { ...profile.banks, [bank]: { ...[bank], auth_data } } }
                        })
                })
                .then(profile => {
                    return MyBankingClientApi.setProfile(profile, profileKey)
                })
                .then(result => {
                    reply("Authentication Completed.").code(201);
                })
                .catch(error => {
                    reply(error).code(500)
                })
        } else {
            return reply(`Invalid bank or code provided`).code(400);
        }
    }

    static getProfile(request, reply) {
        request.log(request.path);

        MyBankingClientApi.getProfile(request.auth.credentials.key)
            .then(profile => {
                reply(new Profile(profile))
            })
            .catch(error => {
                reply(error)
            })
    }

    static getBankProfile(request, reply) {
        request.log(request.path);

        const bank = request.params.bank;
        const profileKey = request.auth.credentials.key;

        MyBankingClientApi.getProfile(profileKey)
            .then(profile => {
                return MyBankingClientApi.getBankProfile(bank, profile)
            })
            .then(profile => {
                reply(new BankProfile(profile.data)).code(profile.code)
            })
            .catch(error => {
                reply({ message: error.message }).code(error.code)
            })
    }

    static getBankAccounts(request, reply) {
        request.log(request.path);

        const bank = request.params.bank;
        MyBankingClientApi.getProfile(request.auth.credentials.key)
            .then(profile => {
                const access_token = profile.banks[bank].auth_data.access_token;
                return MyBankingClientApi.getBankAccounts(bank, access_token)
            })
            .then(accounts => {
                reply(new Accounts(accounts.data))
            })
            .catch(error => { reply(error).code(error.code) })
    }

}