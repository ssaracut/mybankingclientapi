import Hapi from 'hapi';
import Good from 'good';
import HapiAuthJwt from 'hapi-auth-jwt2'
import Bell from 'bell'
import JWT from 'jsonwebtoken'
import MyBankingClientApi from './MyBankingClientApi'
import { Profile, BankProfile } from './DataTypes/ServiceDataTypes'

const server = new Hapi.Server();
const contextRoot = process.env.CONTEXT_ROOT;

server.connection({ port: 8080 });

function validate(decoded, request, callback) {
    MyBankingClientApi.validateProfile(decoded.key)
        .then(isValid => {
            callback(null, isValid);
        })
        .catch(error => { callback(null, false) })
};

function generateJwt(key) {
    return JWT.sign({ key }, 'NeverShareYourSecret');
}


// Register bell with the server
server.register(Bell, function (err) {

    // Declare an authentication strategy using the bell scheme
    // with the name of the provider, cookie encryption password,
    // and the OAuth client credentials.
    server.auth.strategy('google', 'bell', {
        provider: 'google',
        password: 'cookie_encryption_password_secure',
        clientId: process.env.GOOGLE_API_CLIENT_ID,
        clientSecret: process.env.GOOGLE_API_SECRET,
        isSecure: false    // Terrible idea but required if not using HTTPS especially if developing locally        
    });

    server.route({
        method: '*', // Must handle both GET and POST
        path: `${contextRoot}login`,          // The callback endpoint registered with the provider
        config: {
            auth: {
                strategy: 'google',
                mode: 'try'
            },
            handler: function (request, reply) {

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
                            return reply.redirect(location).state("token", generateJwt(profileKey), cookie_options);
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
                                    return reply.redirect(location).state("token", generateJwt(profileKey), cookie_options);
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
        }
    });

});

server.register(HapiAuthJwt, function (err) {

    if (err) {
        console.log(err);
    }

    server.auth.strategy('jwt', 'jwt',
        {
            key: 'NeverShareYourSecret',          // Never Share your secret key 
            validateFunc: validate,            // validate function defined above 
            verifyOptions: { algorithms: ['HS256'] },   // pick a strong algorithm 
            tokenType: 'jwt'
        });

    server.auth.default('jwt');

    server.route([
        {
            method: 'GET',
            config: { auth: false },
            path: `${contextRoot}version`,
            handler: (request, reply) => {
                reply({ version: process.env.npm_package_version });
            }
        },
        {
            method: 'GET',
            config: { auth: { strategies: ['jwt'] } },
            path: `${contextRoot}profile`,
            handler: (request, reply) => {
                MyBankingClientApi.getProfile(request.auth.credentials.key)
                    .then(profile => {
                        reply(new Profile(profile))
                    })
                    .catch(error => {
                        reply(error)
                    })
            }
        },
        {
            method: 'GET',
            config: { auth: { strategies: ['jwt'] } },
            path: `${contextRoot}profile/{bank}`,
            handler: (request, reply) => {
                const bank = request.params.bank;
                MyBankingClientApi.getProfile(request.auth.credentials.key)
                    .then(profile => {
                        const access_token = profile.banks[bank].auth_data.access_token;
                        const refresh_token = profile.banks[bank].auth_data.refresh_token;
                        return MyBankingClientApi.getBankProfile(bank, access_token, refresh_token)
                    })
                    .then(profile => {
                        reply(JSON.stringify(new BankProfile(profile)))
                    })
                    .catch(error => { reply(error).code(error.code) })
            }
        },
        {
            method: 'POST',
            config: { auth: 'jwt' },
            path: `${contextRoot}auth/bank/{bank}`,
            handler: (request, reply) => {
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
                            reply(JSON.stringify(result.profile))
                        })
                        .catch(error => {
                            reply(error).code(500)
                        })
                } else {
                    return reply(`Invalid bank or code provided`).code(400);
                }

            }
        }
    ]);
});

server.register({
    register: Good,
    options: {
        reporters: {
            console: [{
                module: 'good-squeeze',
                name: 'Squeeze',
                args: [{
                    response: '*',
                    log: '*'
                }]
            }, {
                module: 'good-console'
            }, 'stdout']
        }
    }
}, (err) => {

    if (err) {
        throw err; // something bad happened loading the plugin
    }

    server.start((err) => {

        if (err) {
            throw err;
        }
        server.log('info', 'Server running at: ' + server.info.uri);
    });
});